"""Composition du cahier pour l'écran et pour le papier.

Le même document sert aux deux sorties : ce que l'enseignant voit dans
l'éditeur est exactement ce qui part à l'impression. Une seule fonction de
mise en page évite les écarts classiques entre aperçu et PDF.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import ClassInfo, ContentItem, ContentKind, Session
from .numbering import build_plan_numbers, kind_label, roman


@dataclass(frozen=True, slots=True)
class RenderedRow:
    """Une ligne prête à afficher : niveau, numéro, libellé, texte."""

    depth: int
    number: str
    label: str
    text: str
    kind: ContentKind
    bold: bool


def flatten_session(
    session: Session, locale: str = "fr", *, style: str = "roman", numbering: bool = True
) -> list[RenderedRow]:
    """Aplatit le plan en lignes ordonnées, prêtes pour un tableau."""
    numbers = build_plan_numbers(session, style=style, enabled=numbering)
    rows: list[RenderedRow] = []

    def visit(items: list[ContentItem], depth: int) -> None:
        for item in items:
            rows.append(
                RenderedRow(
                    depth=depth,
                    number=numbers.of(item),
                    label=kind_label(item.kind, locale),
                    text=item.text,
                    kind=item.kind,
                    bold=item.is_structural,
                )
            )
            visit(item.children, depth + 1)

    visit(session.items, 0)
    return rows


def session_title(session: Session) -> str:
    """Titre lisible d'une séance : le premier chapitre, sinon la date."""
    for item, _path in session.walk():
        if item.kind is ContentKind.CHAPTER and item.text:
            return item.text
    return session.date.strftime("%d/%m/%Y")


def notebook_html(info: ClassInfo, sessions: list[Session], locale: str, *, style: str = "roman") -> str:
    """Document HTML autonome — utilisé pour l'aperçu et l'export PDF."""
    title = info.full_name if hasattr(info, "full_name") else info.name
    parts: list[str] = [
        "<html><head><meta charset='utf-8'>",
        "<style>",
        "body{font-family:'Segoe UI','Noto Naskh Arabic',sans-serif;color:#2e2016;margin:24px;}",
        "h1{font-size:20px;margin:0 0 4px;}",
        ".meta{color:#6e5a49;font-size:11px;margin-bottom:18px;}",
        "table{width:100%;border-collapse:collapse;font-size:12px;}",
        "th{background:#f6f1e8;border:1px solid #e5ddd2;padding:6px;font-weight:600;text-align:start;}",
        "td{border:1px solid #e5ddd2;padding:6px;vertical-align:top;}",
        ".date{width:88px;text-align:center;color:#6e5a49;}",
        ".num{width:44px;text-align:center;color:#6b4c35;}",
        ".kind{width:78px;color:#6e5a49;font-size:11px;}",
        ".structure{font-weight:700;}",
        ".remark{width:150px;color:#6b4c35;font-size:11px;}",
        ".remark-text{margin-top:10px;font-size:11px;color:#6b4c35;}",
        "</style></head><body>",
        f"<h1>{title}</h1>",
        f"<div class='meta'>{info.subject or ''}{' · ' + info.level if info.level else ''}</div>",
        "<table><thead><tr>"
        "<th class='date'>Date</th><th>Contenu</th><th class='remark'>Remarque</th>"
        "</tr></thead><tbody>",
    ]
    for session in sessions:
        rows = flatten_session(session, locale, style=style)
        if not rows and not session.remark:
            continue
        first = True
        for row in rows:
            cells = []
            if first:
                cells.append(f"<td class='date' rowspan='{len(rows)}'>{session.date.strftime('%d/%m')}</td>")
            css = " class='structure'" if row.bold else ""
            body = f"<span{css}>{row.text}</span>"
            if row.number:
                body = f"<span class='num'>{row.number}</span> {body}"
            if row.kind not in {ContentKind.TEXT, ContentKind.CHAPTER, ContentKind.SECTION}:
                body = f"<span class='kind'>{row.label}</span> {body}"
            cells.append(f"<td style='padding-inline-start:{8 + row.depth * 14}px'>{body}</td>")
            if first:
                remark = session.remark or ""
                cells.append(f"<td class='remark' rowspan='{len(rows)}'>{remark}</td>")
            parts.append("<tr>" + "".join(cells) + "</tr>")
            first = False
        if not rows:
            parts.append(
                f"<tr><td class='date'>{session.date.strftime('%d/%m')}</td>"
                f"<td></td><td class='remark'>{session.remark}</td></tr>"
            )
        if session.homework:
            parts.append(
                f"<tr><td></td><td colspan='2' class='remark-text'>"
                f"Travail à faire : {session.homework}</td></tr>"
            )
    parts.append("</tbody></table></body></html>")
    return "".join(parts)


def yearly_overview(sessions: list[Session]) -> str:
    """Résumé compact : nombre de séances et de chapitres."""
    chapters = sum(1 for session in sessions for item, _ in session.walk() if item.kind is ContentKind.CHAPTER)
    if not sessions:
        return "—"
    first, last = min(s.date for s in sessions), max(s.date for s in sessions)
    span = f"{first.strftime('%d/%m')} → {last.strftime('%d/%m')}"
    return f"{len(sessions)} séance(s) · {chapters} chapitre(s) · {span}"


__all__ = ["RenderedRow", "flatten_session", "notebook_html", "roman", "session_title", "yearly_overview"]
