"""Fixtures partagées : base en mémoire, dépôt et état applicatif."""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import date

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from app.core.models import ClassInfo, Session  # noqa: E402 - après le réglage Qt
from app.data.database import Database  # noqa: E402
from app.data.repository import Repository  # noqa: E402


@pytest.fixture
def database() -> Iterator[Database]:
    base = Database(":memory:")
    try:
        yield base
    finally:
        base.close()


@pytest.fixture
def repository(database: Database) -> Repository:
    return Repository(database)


@pytest.fixture
def maths_class(repository: Repository) -> ClassInfo:
    return repository.add_class(ClassInfo(name="1 PCSI", subject="Mathématiques", level="Prépa"))


@pytest.fixture
def session(repository: Repository, maths_class: ClassInfo) -> Session:
    return repository.add_session(Session(class_id=maths_class.id, date=date(2026, 9, 7)))
