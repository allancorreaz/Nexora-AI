"""Persistencia local de documentos do Nexora AI.

Autoria: Allan de Melo Correa
https://github.com/allancorreaz/Nexora-AI

Armazena metadados e TEXTO EXTRAIDO em SQLite, nao o arquivo original.
Nao inclui autenticacao nem indexacao vetorial: uso local e autorizado.
"""

from __future__ import annotations

from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import sqlite3
from uuid import uuid4

from app.document_processor import SUPPORTED_EXTENSIONS, extract_text


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "knowledge.sqlite3"
DOCUMENT_CATEGORIES = frozenset({"transcricao", "documentacao", "outro"})


class DuplicateDocumentError(ValueError):
    """O mesmo conteudo binario ja foi cadastrado."""


@dataclass(frozen=True)
class StoredDocument:
    id: str
    filename: str
    category: str
    system: str
    extension: str
    sha256: str
    character_count: int
    created_at: str
    text: str


class DocumentRepository:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                category TEXT NOT NULL,
                system TEXT NOT NULL,
                extension TEXT NOT NULL,
                sha256 TEXT NOT NULL UNIQUE,
                character_count INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                text TEXT NOT NULL
            )
            """
        )
        connection.commit()
        return connection

    @contextmanager
    def _connection(self):
        """Garante commit/rollback e fechamento da conexao, inclusive no Windows."""
        with closing(self._connect()) as connection:
            with connection:
                yield connection

    @staticmethod
    def _document(row: sqlite3.Row) -> StoredDocument:
        return StoredDocument(**dict(row))

    def add(
        self,
        filename: str,
        file_content: bytes,
        *,
        category: str,
        system: str = "",
    ) -> StoredDocument:
        """Valida e cadastra o conteudo; duplicidade e garantida pelo SQLite."""
        if category not in DOCUMENT_CATEGORIES:
            raise ValueError("Categoria invalida: transcricao, documentacao ou outro.")
        if not isinstance(system, str) or len(system) > 120:
            raise ValueError("Sistema deve conter ate 120 caracteres.")
        if not isinstance(filename, str) or not filename.strip():
            raise ValueError("Nome do arquivo obrigatorio.")
        if len(file_content) > 5 * 1024 * 1024:
            raise ValueError("O arquivo excede o limite de 5 MB.")

        # O nome enviado e tratado como dado, nunca como caminho de escrita.
        safe_name = filename.replace("\\", "/").rsplit("/", 1)[-1].strip()
        if not safe_name or len(safe_name) > 255:
            raise ValueError("Nome do arquivo invalido.")
        extension = Path(safe_name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValueError("Formato nao suportado.")

        extracted_text = extract_text(safe_name, file_content)
        digest = sha256(file_content).hexdigest()
        document = StoredDocument(
            id=str(uuid4()),
            filename=safe_name,
            category=category,
            system=system.strip(),
            extension=extension,
            sha256=digest,
            character_count=len(extracted_text),
            created_at=datetime.now(timezone.utc).isoformat(),
            text=extracted_text,
        )

        with self._connection() as connection:
            try:
                connection.execute(
                    """
                    INSERT INTO documents
                    (id, filename, category, system, extension, sha256,
                     character_count, created_at, text)
                    VALUES (:id, :filename, :category, :system, :extension, :sha256,
                            :character_count, :created_at, :text)
                    """,
                    vars(document),
                )
            except sqlite3.IntegrityError as exc:
                raise DuplicateDocumentError(
                    "Este arquivo ja foi importado para a base local."
                ) from exc
        return document

    def get(self, document_id: str) -> StoredDocument | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM documents WHERE id = ?", (document_id,)
            ).fetchone()
        return self._document(row) if row else None

    def list(
        self,
        *,
        category: str | None = None,
        limit: int = 100,
    ) -> list[StoredDocument]:
        if category is not None and category not in DOCUMENT_CATEGORIES:
            raise ValueError("Categoria invalida.")
        if not 1 <= limit <= 500:
            raise ValueError("Limite deve estar entre 1 e 500.")

        query = "SELECT * FROM documents"
        parameters: list[str | int] = []
        if category is not None:
            query += " WHERE category = ?"
            parameters.append(category)
        query += " ORDER BY created_at DESC, id DESC LIMIT ?"
        parameters.append(limit)

        with self._connection() as connection:
            rows = connection.execute(query, parameters).fetchall()
        return [self._document(row) for row in rows]

    def delete(self, document_id: str) -> bool:
        with self._connection() as connection:
            cursor = connection.execute(
                "DELETE FROM documents WHERE id = ?", (document_id,)
            )
            return cursor.rowcount > 0
