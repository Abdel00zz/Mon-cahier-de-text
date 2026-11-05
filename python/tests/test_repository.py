"""Dépôt : persistance des classes, séances, plan imbriqué, sauvegardes, archives."""

from __future__ import annotations

from datetime import date

from app.core.models import ClassInfo, ContentItem, ContentKind, Session, Theme
from app.data.repository import Repository


def test_classes_round_trip(repository: Repository) -> None:
    created = repository.add_class(ClassInfo(name="  2   TSI ", subject="Physique", level="Prépa"))

    assert created.name == "2 TSI"
    fetched = repository.class_by_id(created.id)
    assert fetched is not None
    assert fetched.subject == "Physique"
    assert [info.id for info in repository.classes()] == [created.id]


def test_update_and_delete_class(repository: Repository) -> None:
    created = repository.add_class(ClassInfo(name="1 TCO"))
    repository.update_class(created.model_copy(update={"name": "1 TCO B", "level": "Tronc commun"}))

    updated = repository.class_by_id(created.id)
    assert updated is not None
    assert (updated.name, updated.level) == ("1 TCO B", "Tronc commun")

    repository.delete_class(created.id)
    assert repository.class_by_id(created.id) is None


def test_deleting_a_class_removes_its_sessions_and_slots(repository: Repository, maths_class: ClassInfo) -> None:
    repository.add_session(Session(class_id=maths_class.id, date=date(2026, 9, 7)))
    repository.assign_slot(1, 0, maths_class.id)

    repository.delete_class(maths_class.id)

    assert repository.sessions(maths_class.id) == []
    assert repository.timetable() == []


def test_timetable_is_unique_per_slot(repository: Repository) -> None:
    first = repository.add_class(ClassInfo(name="1 A"))
    second = repository.add_class(ClassInfo(name="1 B"))

    repository.assign_slot(2, 3, first.id)
    repository.assign_slot(2, 3, second.id)

    entries = repository.timetable()
    assert len(entries) == 1
    assert entries[0].class_id == second.id

    repository.clear_slot(2, 3)
    assert repository.timetable() == []


def test_nested_plan_survives_a_save(repository: Repository, maths_class: ClassInfo) -> None:
    chapter = ContentItem(kind=ContentKind.CHAPTER, text="Suites")
    section = ContentItem(kind=ContentKind.SECTION, text="Limites")
    section.children = [
        ContentItem(kind=ContentKind.DEFINITION, text="Suite convergente"),
        ContentItem(kind=ContentKind.EXERCISE, text="Calculer", manual_number="12"),
    ]
    chapter.children = [section]
    session = repository.add_session(
        Session(class_id=maths_class.id, date=date(2026, 9, 7), items=[chapter], remark="RAS", homework="Ex. 4")
    )

    stored = repository.session_by_id(session.id)
    assert stored is not None
    assert [item.text for item, _path in stored.walk()] == ["Suites", "Limites", "Suite convergente", "Calculer"]
    assert stored.items[0].children[0].children[1].manual_number == "12"

    stored.items[0].children[0].children[0].text = "Suite convergente (définition)"
    repository.save_session(stored)

    reloaded = repository.session_by_id(session.id)
    assert reloaded is not None
    assert [item.text for item, _path in reloaded.walk()][2] == "Suite convergente (définition)"


def test_ensure_session_is_idempotent(repository: Repository, maths_class: ClassInfo) -> None:
    first = repository.ensure_session(maths_class.id, date(2026, 9, 7))
    second = repository.ensure_session(maths_class.id, date(2026, 9, 7))

    assert first.id == second.id
    assert len(repository.sessions(maths_class.id)) == 1


def test_config_defaults_and_save(repository: Repository) -> None:
    config = repository.config()
    assert config.theme is Theme.SYSTEM

    repository.save_config(config.model_copy(update={"establishment_name": "Lycée Al Massira"}))
    assert repository.config().establishment_name == "Lycée Al Massira"


def test_import_workspace_replaces_everything(repository: Repository, maths_class: ClassInfo) -> None:
    repository.add_session(Session(class_id=maths_class.id, date=date(2026, 9, 7)))
    payload = repository.export_workspace()

    other = ClassInfo(name="Autre")
    repository.add_class(other)
    assert len(repository.classes()) == 2

    repository.import_workspace(payload)

    assert [info.name for info in repository.classes()] == [maths_class.name]


def test_archive_keeps_a_frozen_copy(repository: Repository, maths_class: ClassInfo) -> None:
    repository.add_session(Session(class_id=maths_class.id, date=date(2026, 9, 7)))

    archive = repository.create_archive("2026-2027")

    assert archive.class_count == 1
    assert archive.session_count == 1
    assert len(repository.archives()) == 1

    repository.delete_class(maths_class.id)
    restored = repository.archive_payload(archive.id)
    assert restored is not None
    assert restored.classes[0].name == maths_class.name


def test_json_round_trip_is_lossless(repository: Repository, maths_class: ClassInfo) -> None:
    repository.add_session(Session(class_id=maths_class.id, date=date(2026, 9, 7)))

    payload = repository.to_json()
    workspace = repository.from_json(payload)

    assert workspace.classes[0].id == maths_class.id
    assert repository.from_json(repository.to_json()).config.locale is repository.config().locale


def test_unknown_archive_returns_none(repository: Repository) -> None:
    assert repository.archive_payload("inconnu") is None
