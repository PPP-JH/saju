from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./saju_local.db')

engine_kwargs: dict = {
    'pool_pre_ping': True,
}
if DATABASE_URL.startswith('sqlite'):
    engine_kwargs['connect_args'] = {'check_same_thread': False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from .db_models import Base

    Base.metadata.create_all(bind=engine)
