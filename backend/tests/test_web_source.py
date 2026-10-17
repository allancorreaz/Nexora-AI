"""Testes locais de URLs autorizadas e da API de previa web.

Nao acessam a internet nem usam documentos de terceiros.
"""

import unittest
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.web_source import WebSourceError, _ArticleTextParser, validate_public_url


class WebSourceTests(unittest.TestCase):
    def test_allows_only_expected_public_help_pages(self):
        url = "https://ajuda.alterdata.com.br/bimerbase/bimer-instalacao/artigo"
        self.assertEqual(validate_public_url(url), url)

    def test_blocks_non_https_or_external_domain(self):
        for url in (
            "http://ajuda.alterdata.com.br/bimerbase/artigo",
            "https://example.com/bimerbase/artigo",
            "https://ajuda.alterdata.com.br.evil.com/bimerbase/artigo",
            "https://127.0.0.1/bimerbase/artigo",
            "https://ajuda.alterdata.com.br@evil.example/bimerbase/artigo",
            "file:///etc/passwd",
            "https://ajuda.alterdata.com.br/bimerbase",
        ):
            with self.subTest(url=url), self.assertRaises(WebSourceError):
                validate_public_url(url)

    def test_extracts_main_and_title_ignoring_navigation(self):
        parser = _ArticleTextParser()
        parser.feed(
            "<html><head><title>Guia de Estoque</title></head>"
            "<body><nav>Menu externo</nav><main><h1>Conferencia</h1>"
            "<p>Conferir antes de armazenar.</p></main></body></html>"
        )
        title, text = parser.result()
        self.assertEqual(title, "Guia de Estoque")
        self.assertIn("Conferir antes de armazenar.", text)
        self.assertNotIn("Menu externo", text)


class WebPreviewRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_article_without_persistence(self):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            with patch(
                "app.document_routes.preview_public_article",
                new_callable=AsyncMock,
                return_value={
                    "url": "https://ajuda.alterdata.com.br/bimerbase/exemplo",
                    "title": "Exemplo",
                    "text": "Procedimento de teste",
                    "characters": 21,
                    "truncated": False,
                    "saved": False,
                },
            ):
                result = await client.post(
                    "/api/documents/web/preview",
                    json={"url": "https://ajuda.alterdata.com.br/bimerbase/exemplo"},
                )
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()["saved"])

    async def test_reports_invalid_source(self):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            with patch(
                "app.document_routes.preview_public_article",
                new_callable=AsyncMock,
                side_effect=WebSourceError("Dominio bloqueado"),
            ):
                result = await client.post(
                    "/api/documents/web/preview",
                    json={"url": "https://example.com/"},
                )
        self.assertEqual(result.status_code, 422)
        self.assertIn("Dominio bloqueado", result.json()["detail"])


if __name__ == "__main__":
    unittest.main()
