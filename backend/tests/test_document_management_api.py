"""Testes das rotas de documentos com SQLite temporario e isolado."""

from pathlib import Path
import tempfile
import unittest

from httpx import ASGITransport, AsyncClient

from app.document_repository import DocumentRepository
from app.document_routes import get_document_repository
from app.main import app


class DocumentManagementAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.repository = DocumentRepository(
            Path(self.tempdir.name) / "data" / "test.sqlite3"
        )
        app.dependency_overrides[get_document_repository] = lambda: self.repository
        self.client = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.pop(get_document_repository, None)
        self.tempdir.cleanup()

    async def _upload(self, content=b"Passo 1: conferir mercadorias", name="treinamento.txt",
                      category="transcricao", system="Flex Smart"):
        return await self.client.post(
            "/api/documents",
            files={"file": (name, content)},
            data={"category": category, "system": system},
        )

    async def test_import_list_get_delete_lifecycle(self):
        uploaded = await self._upload()
        self.assertEqual(uploaded.status_code, 201)
        doc = uploaded.json()
        self.assertEqual(doc["category"], "transcricao")
        self.assertEqual(doc["system"], "Flex Smart")
        self.assertNotIn("text", doc)

        listed = await self.client.get("/api/documents")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        self.assertNotIn("text", listed.json()[0])

        detail = await self.client.get(f"/api/documents/{doc['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertIn("conferir mercadorias", detail.json()["text"])

        deleted = await self.client.delete(f"/api/documents/{doc['id']}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual((await self.client.get("/api/documents")).json(), [])
        self.assertEqual(
            (await self.client.get(f"/api/documents/{doc['id']}")).status_code,
            404,
        )
        self.assertEqual(
            (await self.client.delete(f"/api/documents/{doc['id']}")).status_code,
            404,
        )

    async def test_duplicate_returns_conflict(self):
        self.assertEqual((await self._upload()).status_code, 201)
        repeated = await self._upload(name="outro_nome.txt")
        self.assertEqual(repeated.status_code, 409)
        self.assertEqual(len((await self.client.get("/api/documents")).json()), 1)

    async def test_category_filter(self):
        self.assertEqual((await self._upload()).status_code, 201)
        self.assertEqual(
            (await self._upload(content=b"Outra documentacao", category="documentacao")).status_code,
            201,
        )
        result = await self.client.get("/api/documents?category=documentacao")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(result.json()), 1)
        self.assertEqual(result.json()[0]["category"], "documentacao")

    async def test_rejects_unsupported_file(self):
        response = await self._upload(content=b"dados", name="arquivo.exe")
        self.assertEqual(response.status_code, 422)

    async def test_rejects_invalid_category(self):
        response = await self._upload(category="interno")
        self.assertEqual(response.status_code, 422)

    async def test_rejects_large_file(self):
        response = await self._upload(content=b"a" * (5 * 1024 * 1024 + 1))
        self.assertEqual(response.status_code, 413)

    async def test_rejects_invalid_list_query(self):
        response = await self.client.get("/api/documents?limit=0")
        self.assertEqual(response.status_code, 422)
        response = await self.client.get("/api/documents?category=desconhecida")
        self.assertEqual(response.status_code, 422)

    async def test_preview_does_not_persist(self):
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("preview.txt", b"apenas previa")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual((await self.client.get("/api/documents")).json(), [])


if __name__ == "__main__":
    unittest.main()
