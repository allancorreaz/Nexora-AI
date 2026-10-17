"""Testes de importacao de artigos web e compatibilidade com SQLite anterior."""
import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.document_repository import DocumentRepository, DuplicateDocumentError
from app.document_routes import get_document_repository
from app.main import app


ARTICLE = {
    "url": "https://ajuda.alterdata.com.br/bimerbase/artigo-exemplo",
    "title": "Instalacao do Bimer",
    "text": "Antes de instalar, verifique a rede e o arquivo ERP.ini.",
    "characters": 54,
    "truncated": False,
    "saved": False,
}


class WebPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "db.sqlite3"
        self.repo = DocumentRepository(self.path)

    def test_web_document_has_source_url_and_is_listed(self):
        doc = self.repo.add_web(
            url=ARTICLE["url"], title=ARTICLE["title"], text=ARTICLE["text"]
        )
        self.assertEqual(doc.extension, ".html")
        self.assertEqual(doc.category, "documentacao")
        self.assertEqual(doc.source_url, ARTICLE["url"])
        self.assertEqual(self.repo.get(doc.id).text, ARTICLE["text"])
        self.assertEqual(self.repo.list()[0].source_url, ARTICLE["url"])

    def test_web_duplicate_by_url(self):
        self.repo.add_web(url=ARTICLE["url"], title="Primeira", text="Versao inicial")
        with self.assertRaises(DuplicateDocumentError):
            self.repo.add_web(url=ARTICLE["url"], title="Segunda", text="Versao atualizada")

    def test_migrates_existing_database_preserving_documents(self):
        with closing(sqlite3.connect(self.path)) as connection:
            connection.execute(
                """CREATE TABLE documents (
                    id TEXT PRIMARY KEY, filename TEXT NOT NULL,
                    category TEXT NOT NULL, system TEXT NOT NULL,
                    extension TEXT NOT NULL, sha256 TEXT NOT NULL UNIQUE,
                    character_count INTEGER NOT NULL, created_at TEXT NOT NULL,
                    text TEXT NOT NULL
                )"""
            )
            connection.execute(
                """INSERT INTO documents VALUES
                ('old-id','antigo.txt','transcricao','ERP','.txt','oldhash',5,'2026-01-01','texto')"""
            )
            connection.commit()
        existing = self.repo.get("old-id")
        self.assertEqual(existing.text, "texto")
        self.assertEqual(existing.source_url, "")
        added = self.repo.add("novo.txt", b"novo conteudo", category="outro")
        self.assertEqual(added.source_url, "")


class WebImportAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = DocumentRepository(Path(self.tmp.name) / "test.sqlite3")
        app.dependency_overrides[get_document_repository] = lambda: self.repo
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.pop(get_document_repository, None)
        self.tmp.cleanup()

    async def test_import_and_duplicate(self):
        with patch("app.document_routes.preview_public_article", new_callable=AsyncMock, return_value=ARTICLE):
            first = await self.client.post("/api/documents/web/import", json={"url": ARTICLE["url"]})
            second = await self.client.post("/api/documents/web/import", json={"url": ARTICLE["url"]})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.json()["source_url"], ARTICLE["url"])
        self.assertEqual(second.status_code, 409)
        self.assertEqual(len((await self.client.get("/api/documents")).json()), 1)

    async def test_rejects_truncated_article(self):
        with patch("app.document_routes.preview_public_article", new_callable=AsyncMock, return_value={**ARTICLE, "truncated": True}):
            response = await self.client.post("/api/documents/web/import", json={"url": ARTICLE["url"]})
        self.assertEqual(response.status_code, 422)
        self.assertEqual((await self.client.get("/api/documents")).json(), [])


if __name__ == "__main__":
    unittest.main()
