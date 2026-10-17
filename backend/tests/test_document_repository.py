"""Testes isolados do repositorio SQLite usando diretorio temporario."""

import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path

from app.document_repository import (
    DocumentRepository,
    DuplicateDocumentError,
)


class DocumentRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "nested" / "documents.sqlite3"
        self.repository = DocumentRepository(self.path)

    def test_add_and_read_after_reopening_repository(self):
        doc = self.repository.add(
            "WMS.txt",
            "Endereçamento de produtos".encode("utf-8"),
            category="transcricao",
            system="Flex Smart",
        )
        self.assertTrue(self.path.exists())
        reopened = DocumentRepository(self.path).get(doc.id)
        self.assertIsNotNone(reopened)
        self.assertEqual(reopened.text, "Endereçamento de produtos")
        self.assertEqual(reopened.system, "Flex Smart")
        self.assertEqual(reopened.category, "transcricao")
        self.assertEqual(len(reopened.sha256), 64)

    def test_prevents_exact_duplicate_even_with_different_filename(self):
        content = b"mesmo texto"
        self.repository.add("primeiro.txt", content, category="transcricao")
        with self.assertRaises(DuplicateDocumentError):
            self.repository.add("segundo.txt", content, category="documentacao")
        self.assertEqual(len(self.repository.list()), 1)

    def test_lists_and_filters_categories(self):
        self.repository.add("a.txt", b"passo a", category="transcricao")
        self.repository.add("b.txt", b"passo b", category="documentacao")
        self.repository.add("c.txt", b"passo c", category="outro")
        self.assertEqual(len(self.repository.list()), 3)
        self.assertEqual(len(self.repository.list(category="transcricao")), 1)
        self.assertEqual(self.repository.list(limit=1)[0].character_count, 7)

    def test_delete_and_allow_reimport(self):
        doc = self.repository.add("manual.md", b"# Manual", category="documentacao")
        self.assertTrue(self.repository.delete(doc.id))
        self.assertIsNone(self.repository.get(doc.id))
        self.assertFalse(self.repository.delete(doc.id))
        self.repository.add("manual.md", b"# Manual", category="documentacao")
        self.assertEqual(len(self.repository.list()), 1)

    def test_rejects_unknown_category_before_creating_database(self):
        with self.assertRaises(ValueError):
            self.repository.add("x.txt", b"x", category="confidencial")
        self.assertFalse(self.path.exists())

    def test_rejects_oversized_document(self):
        with self.assertRaisesRegex(ValueError, "5 MB"):
            self.repository.add(
                "grande.txt", b"x" * (5 * 1024 * 1024 + 1), category="outro"
            )
        self.assertFalse(self.path.exists())

    def test_does_not_use_filename_as_disk_path(self):
        doc = self.repository.add(
            "../caminho/../processo.txt", b"texto", category="transcricao"
        )
        self.assertEqual(doc.filename, "processo.txt")
        self.assertFalse((Path(self.directory.name) / "processo.txt").exists())

    def test_invalid_filters_and_limit(self):
        with self.assertRaises(ValueError):
            self.repository.list(category="outra")
        with self.assertRaises(ValueError):
            self.repository.list(limit=0)

    def test_schema_contains_no_raw_file_column(self):
        self.repository.add("doc.txt", b"texto", category="outro")
        with closing(sqlite3.connect(self.path)) as connection:
            columns = [row[1] for row in connection.execute("PRAGMA table_info(documents)")]
        self.assertIn("text", columns)
        self.assertNotIn("raw_file", columns)


if __name__ == "__main__":
    unittest.main()
