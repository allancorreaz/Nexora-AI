import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient, Request, Response

from app.main import app


class TestNexoraAPI(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_health(self):
        response = await self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(
            response.json()["service"],
            "nexora-ai-backend",
        )

    async def test_health_ai_modelo_disponivel(self):
        ollama_response = Response(
            200,
            json={"models": [{"name": "qwen3:1.7b"}]},
            request=Request("GET", "http://127.0.0.1:11434/api/tags"),
        )

        with patch("app.main.httpx.AsyncClient") as client_class:
            client = client_class.return_value.__aenter__.return_value
            client.get = AsyncMock(return_value=ollama_response)
            response = await self.client.get("/health/ai")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ready")
        self.assertEqual(response.json()["model"], "qwen3:1.7b")

    async def test_health_ai_modelo_ausente(self):
        ollama_response = Response(
            200,
            json={"models": []},
            request=Request("GET", "http://127.0.0.1:11434/api/tags"),
        )

        with patch("app.main.httpx.AsyncClient") as client_class:
            client = client_class.return_value.__aenter__.return_value
            client.get = AsyncMock(return_value=ollama_response)
            response = await self.client.get("/health/ai")

        self.assertEqual(response.status_code, 503)

    async def test_chat_com_resposta_simulada(self):
        provider = SimpleNamespace(
            generate=AsyncMock(return_value="Olá! Sou a Nexora AI.")
        )

        with patch("app.main.get_ai_provider", return_value=provider):
            response = await self.client.post(
                "/api/chat",
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": "Olá!",
                        }
                    ]
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["response"], "Olá! Sou a Nexora AI.")
        provider.generate.assert_awaited_once()

    async def test_chat_sem_mensagens(self):
        response = await self.client.post(
            "/api/chat",
            json={"messages": []},
        )
        self.assertEqual(response.status_code, 422)

    async def test_chat_com_role_invalida(self):
        response = await self.client.post(
            "/api/chat",
            json={
                "messages": [
                    {
                        "role": "admin",
                        "content": "Teste",
                    }
                ]
            },
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
