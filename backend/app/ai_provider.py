
from typing import Literal

import httpx
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_provider: str = "ollama"
    ai_base_url: str = "http://127.0.0.1:11434"
    ai_model: str = "qwen3:1.7b"
    ai_max_concurrent_requests: int = 1
    ai_queue_timeout_seconds: float = 5
    ai_request_timeout_seconds: float = 120
    ai_max_output_tokens: int = 512

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIProvider:
    async def generate(self, messages: list[ChatMessage]) -> str:
        raise NotImplementedError


class OllamaProvider(AIProvider):
    async def generate(self, messages: list[ChatMessage]) -> str:
        payload = {
            "model": settings.ai_model,
            "messages": [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ],
            "stream": False,
            "think": False,
            "options": {
                "num_predict": settings.ai_max_output_tokens,
            },
        }

        async with httpx.AsyncClient(
            timeout=settings.ai_request_timeout_seconds
        ) as client:
            response = await client.post(
                f"{settings.ai_base_url.rstrip('/')}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        data = response.json()
        return data["message"]["content"]


def get_ai_provider() -> AIProvider:
    if settings.ai_provider == "ollama":
        return OllamaProvider()

    raise ValueError(
        f"Provedor de IA não suportado: {settings.ai_provider}"
    )
