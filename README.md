# Онлайн-библиотека (FastAPI)

Веб-приложение: REST API на **FastAPI** и статический фронтенд в каталоге `frontend/` (раздаётся с сервера).

## Требования

- **Python** 3.10+ (рекомендуется 3.12)
- Файл зависимостей: `requirements.txt` (сохранять в кодировке **UTF-8**)

## Запуск локально

Из корня репозитория:

```bash
cd backend
python -m venv .venv
```

Активация окружения:

- Windows (PowerShell): `.\.venv\Scripts\Activate.ps1`
- Linux/macOS: `source .venv/bin/activate`

Установка пакетов и старт сервера:

```bash
pip install -r ../requirements.txt
python run.py
```

По умолчанию API и раздача фронта слушают **[http://127.0.0.1:3000](http://127.0.0.1:3000)** (см. `backend/run.py`). Главная страница — **/** (редирект на каталог фронта).

## Конфигурация (`.env`)

Файл положите в `**backend/.env`** (читает `app.config.Settings`):


| Переменная     | По умолчанию             | Описание                            |
| -------------- | ------------------------ | ----------------------------------- |
| `DATABASE_URL` | `sqlite:///./library.db` | SQLite                              |
| `DEBUG`        | `true`                   | при `true` у uvicorn включён reload |


Остальные поля см. в `backend/app/config.py`.

## Версии основного стека

Зафиксировано в `requirements.txt` (фрагмент):


| Компонент        | Версия  |
| ---------------- | ------- |
| FastAPI          | 0.136.0 |
| Uvicorn          | 0.44.0  |
| Starlette        | 1.0.0   |
| Pydantic         | 2.13.2  |
| SQLAlchemy       | 2.0.49  |
| python-jose      | 3.5.0   |
| passlib          | 1.7.4   |
| psycopg2-binary  | 2.9.10  |
| python-multipart | 0.0.26  |


Полный список зависимостей и точные версии — в `requirements.txt`.

## Структура

- `backend/`
  - `/app/` - приложение
    - `/models` - модели
    - `/schemas` - схемы
    - `auth.py` - авторизация
    - `config.py` - конфигурация
    - `database.py` - база данных
    - `main.py` - основной файл (все эндпоинты)
  - `run.py` - файл запуска 
- `frontend/` — HTML/CSS/JS

