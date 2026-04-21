from collections.abc import Sequence
import mimetypes
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import asc, desc, func, or_, select, text
from sqlalchemy.orm import Session, joinedload
from starlette.formparsers import MultiPartParser

from .auth import create_access_token, get_current_user, hash_password, require_roles, verify_password
from .database import Base, engine, get_db
from .models import Book, Message, Book_Rating, User, UserRole
from .schemas import AdminStats, BookCreate, BookDetail, BookPublic, BookUpdate, ChatMessageCreate, ChatMessagePublic, LoginRequest, PagedBooks, RatingCreate, RoleUpdate, Token, UserCreate, UserPublic, UserStatusUpdate

app = FastAPI(title="Online Library")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_INDEX = Path(__file__).resolve().parent.parent / "frontend" / "pages" / "index.html"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")
MAX_BOOK_FILE_SIZE = 100 * 1024 * 1024
MultiPartParser.max_file_size = MAX_BOOK_FILE_SIZE
MultiPartParser.max_part_size = MAX_BOOK_FILE_SIZE


def recalculate_average_rating(db: Session, book_id: int) -> None:
    avg_score = db.scalar(select(func.avg(Book_Rating.score)).where(Book_Rating.book_id == book_id))
    book = db.get(Book, book_id)
    if book:
        book.average_rating = float(avg_score or 0.0)
        db.add(book)


def to_book_public(book: Book) -> BookPublic:
    return BookPublic(
        id=book.id,
        title=book.title,
        author=book.author,
        description=book.description,
        file_url=book.file_url,
        file_name=book.file_name,
        file_mime=book.file_mime,
        has_file=book.file_data is not None,
        average_rating=book.average_rating,
        created_at=book.created_at,
        updated_at=book.updated_at,
    )


def to_book_detail(book: Book) -> BookDetail:
    return BookDetail(
        **to_book_public(book).model_dump(),
        content=book.content,
    )


def ensure_book_file_columns() -> None:
    with engine.begin() as conn:
        columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(books)"))
        }
        if "file_name" not in columns:
            conn.execute(text("ALTER TABLE books ADD COLUMN file_name VARCHAR(255)"))
        if "file_mime" not in columns:
            conn.execute(text("ALTER TABLE books ADD COLUMN file_mime VARCHAR(120)"))
        if "file_data" not in columns:
            conn.execute(text("ALTER TABLE books ADD COLUMN file_data BLOB"))


def extract_text_from_uploaded_file(upload: UploadFile, data: bytes) -> str | None:
    content_type = (upload.content_type or "").lower()
    file_name = (upload.filename or "").lower()
    if content_type.startswith("text/") or file_name.endswith(".txt"):
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError:
            return data.decode("utf-8", errors="ignore")
    return None


def build_content_disposition(filename: str, download: bool) -> str:
    fallback_ascii = filename.encode("ascii", errors="ignore").decode("ascii").strip()
    if not fallback_ascii:
        fallback_ascii = "book_file"
    fallback_ascii = fallback_ascii.replace("\\", "_").replace('"', "'")
    utf8_name = quote(filename, safe="")
    mode = "attachment" if download else "inline"
    return f"{mode}; filename=\"{fallback_ascii}\"; filename*=UTF-8''{utf8_name}"


def resolve_media_type(filename: str, stored_mime: str | None) -> str:
    mime = (stored_mime or "").strip().lower()
    if mime and mime != "application/octet-stream":
        return mime
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def ensure_seed_data(db: Session) -> None:
    admin_exists = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.admin))
    if admin_exists:
        return

    admin = User(
        email="admin@library.local",
        full_name="System Admin",
        password_hash=hash_password("admin123"),
        role=UserRole.admin,
    )
    librarian = User(
        email="librarian@library.local",
        full_name="Default Librarian",
        password_hash=hash_password("librarian123"),
        role=UserRole.librarian,
    )
    demo_book = Book(
        title="Пример книги",
        author="Демо Автор",
        description="Демонстрационная книга для старта работы с приложением.",
        content=(
            "Это демонстрационный текст книги. Вы можете заменить его через интерфейс библиотекаря. "
            "Также здесь можно разместить полный текст произведения для чтения онлайн."
        ),
    )
    db.add_all([admin, librarian, demo_book])
    db.commit()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_book_file_columns()
    with Session(engine) as db:
        ensure_seed_data(db)


@app.get("/")
def frontend_root():
    return FileResponse(FRONTEND_INDEX)


@app.api_route("/api/v1/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def api_v1_proxy(path: str, request: Request):
    target = f"/api/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(url=target, status_code=307)


@app.post("/api/auth/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=UserRole.reader,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is blocked")
    return Token(access_token=create_access_token(str(user.id)))


@app.get("/api/users/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/books", response_model=PagedBooks)
def list_books(
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    search: str | None = Query(default=None, max_length=120),
    min_rating: float | None = Query(default=None, ge=0, le=5),
    sort_by: str = Query(default="date_desc", pattern="^(date_desc|date_asc|rating_desc|rating_asc)$"),
):
    stmt = select(Book)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(Book.title.ilike(term), Book.author.ilike(term)))
    if min_rating is not None:
        stmt = stmt.where(Book.average_rating >= min_rating)

    sort_expr = {
        "date_desc": desc(Book.created_at),
        "date_asc": asc(Book.created_at),
        "rating_desc": desc(Book.average_rating),
        "rating_asc": asc(Book.average_rating),
    }[sort_by]
    stmt = stmt.order_by(sort_expr, desc(Book.id))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0

    offset = (page - 1) * page_size
    items = db.scalars(stmt.offset(offset).limit(page_size)).all()
    return PagedBooks(items=[to_book_public(item) for item in items], page=page, page_size=page_size, total=total)


@app.get("/api/books/{book_id}", response_model=BookPublic)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return to_book_public(book)


@app.get("/api/books/{book_id}/content", response_model=BookDetail)
def get_book_content(
    book_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.reader, UserRole.librarian, UserRole.admin)),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return to_book_detail(book)


@app.post("/api/books", response_model=BookPublic, status_code=status.HTTP_201_CREATED)
def create_book(
    payload: BookCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.librarian, UserRole.admin)),
):
    book = Book(**payload.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return to_book_public(book)


@app.put("/api/books/{book_id}", response_model=BookPublic)
def update_book(
    book_id: int,
    payload: BookUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.librarian, UserRole.admin)),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(book, field_name, value)
    db.add(book)
    db.commit()
    db.refresh(book)
    return to_book_public(book)


@app.post("/api/books/upload", response_model=BookPublic, status_code=status.HTTP_201_CREATED)
async def upload_book_file(
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.librarian, UserRole.admin)),
):
    try:
        form = await request.form(max_part_size=MAX_BOOK_FILE_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    title = str(form.get("title", ""))
    author = str(form.get("author", ""))
    description = str(form.get("description", ""))
    content_raw = form.get("content")
    content = str(content_raw) if content_raw is not None else None
    file = form.get("file")

    title = title.strip()
    author = author.strip()
    description = description.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if len(title) > 255:
        raise HTTPException(status_code=400, detail="Title is too long")
    if not author:
        raise HTTPException(status_code=400, detail="Author is required")
    if len(author) > 180:
        raise HTTPException(status_code=400, detail="Author is too long")
    if len(description) < 3:
        raise HTTPException(status_code=400, detail="Description must contain at least 3 characters")
    if len(description) > 4000:
        raise HTTPException(status_code=400, detail="Description is too long")
    if file is None or not hasattr(file, "read"):
        raise HTTPException(status_code=400, detail="File is required")

    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(file_data) > MAX_BOOK_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size is 100 MB")

    extracted_text = extract_text_from_uploaded_file(file, file_data)
    final_content = (content or "").strip() or extracted_text or "Файл книги загружен. Текст для предпросмотра недоступен."

    book = Book(
        title=title,
        author=author,
        description=description,
        content=final_content,
        file_name=(file.filename or "book_file").strip()[:255],
        file_mime=(file.content_type or "application/octet-stream")[:120],
        file_data=file_data,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return to_book_public(book)


@app.put("/api/books/{book_id}/upload", response_model=BookPublic)
async def replace_book_file(
    book_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.librarian, UserRole.admin)),
):
    try:
        form = await request.form(max_part_size=MAX_BOOK_FILE_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    content_raw = form.get("content")
    content = str(content_raw) if content_raw is not None else None
    file = form.get("file")

    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if file is None or not hasattr(file, "read"):
        raise HTTPException(status_code=400, detail="File is required")
    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(file_data) > MAX_BOOK_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size is 100 MB")

    extracted_text = extract_text_from_uploaded_file(file, file_data)
    if (content or "").strip():
        book.content = content.strip()
    elif extracted_text:
        book.content = extracted_text
    book.file_name = (file.filename or "book_file").strip()[:255]
    book.file_mime = (file.content_type or "application/octet-stream")[:120]
    book.file_data = file_data
    db.add(book)
    db.commit()
    db.refresh(book)
    return to_book_public(book)


@app.get("/api/books/{book_id}/file")
def download_book_file(
    book_id: int,
    db: Session = Depends(get_db),
    download: bool = Query(default=False),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if not book.file_data:
        raise HTTPException(status_code=404, detail="Book file not found")

    filename = (book.file_name or "book_file").strip()[:255]
    media_type = resolve_media_type(filename, book.file_mime)

    return Response(
        content=book.file_data,
        media_type=media_type,
        headers={
            "Content-Disposition": build_content_disposition(filename, download),
        },
    )


@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.librarian, UserRole.admin)),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()


@app.post("/api/books/{book_id}/rate", response_model=BookPublic)
def rate_book(
    book_id: int,
    payload: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.reader, UserRole.librarian, UserRole.admin)),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    rating = db.scalar(
        select(Book_Rating).where(Book_Rating.user_id == current_user.id, Book_Rating.book_id == book_id)
    )
    if rating:
        rating.score = payload.score
    else:
        rating = Book_Rating(user_id=current_user.id, book_id=book_id, score=payload.score)
        db.add(rating)

    recalculate_average_rating(db, book_id)
    db.commit()
    db.refresh(book)
    return to_book_public(book)


@app.get("/api/admin/users", response_model=list[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    users = db.scalars(select(User).order_by(desc(User.created_at))).all()
    return list(users)


@app.patch("/api/admin/users/{user_id}/role", response_model=UserPublic)
def update_user_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/api/admin/users/{user_id}/status", response_model=UserPublic)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/admin/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return AdminStats(
        users_count=db.scalar(select(func.count()).select_from(User)) or 0,
        books_count=db.scalar(select(func.count()).select_from(Book)) or 0,
        messages_count=db.scalar(select(func.count()).select_from(Message)) or 0,
        ratings_count=db.scalar(select(func.count()).select_from(Book_Rating)) or 0,
    )


@app.get("/api/chat/messages", response_model=list[ChatMessagePublic])
def list_messages(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
) -> Sequence[ChatMessagePublic]:
    messages = db.scalars(
        select(Message)
        .options(joinedload(Message.sender))
        .order_by(desc(Message.id))
        .limit(limit)
    ).all()
    messages = list(reversed(messages))
    return [
        ChatMessagePublic(
            id=message.id,
            text=message.text,
            created_at=message.created_at,
            sender_id=message.sender_id,
            sender_name=message.sender.full_name,
        )
        for message in messages
    ]


@app.post("/api/chat/messages", response_model=ChatMessagePublic, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = Message(
        sender_id=current_user.id,
        text=payload.text.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return ChatMessagePublic(
        id=message.id,
        text=message.text,
        created_at=message.created_at,
        sender_id=message.sender_id,
        sender_name=current_user.full_name,
    )
