import os
import tempfile
import atexit

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings


def _build_engine():
    connect_args = {}

    if settings.DB_SSL_CA:
        # Render env vars may escape newlines as literal \n — normalise them
        pem = settings.DB_SSL_CA.replace("\\n", "\n")
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".pem", delete=False)
        tmp.write(pem)
        tmp.close()
        atexit.register(lambda path=tmp.name: os.path.exists(path) and os.remove(path))
        connect_args["ssl"] = {"ca": tmp.name}

    return create_engine(
        settings.database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


engine = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    __allow_unmapped__ = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
