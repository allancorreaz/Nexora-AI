"""Testes do endpoint de previa de documentos (sem persistencia)."""

import unittest
from io import BytesIO

from docx import Document
from httpx import ASGITransport, AsyncClient
from pypdf import PdfWriter

from app.main import MAX_DOCUMENT_BYTES, app


class DocumentPreviewAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_txt_preview_and_no_storage(self):
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("treinamento.txt", "Conferência de estoque".encode("utf-8"))},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["filename"], "treinamento.txt")
        self.assertEqual(data["preview"], "Conferência de estoque")
        self.assertEqual(data["characters"], len("Conferência de estoque"))
        self.assertFalse(data["saved"])
        self.assertFalse(data["truncated"])

    async def test_docx_preview(self):
        document = Document()
        document.add_paragraph("Procedimento de entrada")
        buffer = BytesIO()
        document.save(buffer)

        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("manual.docx", buffer.getvalue())},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Procedimento de entrada", response.json()["preview"])

    async def test_rejects_unsupported_extension(self):
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("programa.exe", b"teste")},
        )
        self.assertEqual(response.status_code, 422)

    async def test_rejects_empty_document(self):
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("vazio.txt", b"")},
        )
        self.assertEqual(response.status_code, 422)

    async def test_rejects_oversized_document(self):
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("grande.txt", b"a" * (MAX_DOCUMENT_BYTES + 1))},
        )
        self.assertEqual(response.status_code, 413)

    async def test_rejects_pdf_without_extractable_text(self):
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        buffer = BytesIO()
        writer.write(buffer)
        response = await self.client.post(
            "/api/documents/preview",
            files={"file": ("digitalizado.pdf", buffer.getvalue())},
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("OCR", response.json()["detail"])

    async def test_rejects_missing_file(self):
        response = await self.client.post("/api/documents/preview")
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
