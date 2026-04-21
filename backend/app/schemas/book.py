from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=10, max_length=4000)
    content: str = Field(min_length=10)
    file_url: Optional[str] = Field(default=None, max_length=500)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    author: Optional[str] = Field(default=None, min_length=1, max_length=180)
    description: Optional[str] = Field(default=None, min_length=10, max_length=4000)
    content: Optional[str] = Field(default=None, min_length=10)
    file_url: Optional[str] = Field(default=None, max_length=500)


class BookPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    description: str
    file_url: Optional[str]
    file_name: Optional[str]
    file_mime: Optional[str]
    has_file: bool = False
    average_rating: float
    created_at: datetime
    updated_at: datetime


class BookDetail(BookPublic):
    content: str

class RatingCreate(BaseModel):
    score: int = Field(ge=1, le=5)

class PagedBooks(BaseModel):
    items: list[BookPublic]
    page: int
    page_size: int
    total: int