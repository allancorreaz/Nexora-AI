
import asyncio

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai_provider import (
    ChatMessage,
    get_ai_provider,
    settings,
)


app = FastAPI(
    title="Nexora AI API",
    description="Backend da plataforma Nexora AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

inference_limit = asyncio.Semaphore(
    max(1, settings.ai_max_concurrent_requests)
)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class ChatResponse(BaseModel):
    response: str
    model: str


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "nexora-ai-backend",
        "model": settings.ai_model,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    acquired = False

    try:
        await asyncio.wait_for(
            inference_limit.acquire(),
            timeout=settings.ai_queue_timeout_seconds,
        )
        acquired = True

        provider = get_ai_provider()
        response = await provider.generate(request.messages)

        return ChatResponse(
            response=response,
            model=settings.ai_model,
        )

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=429,
            detail="Servidor ocupado. Tente novamente em instantes.",
        )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="O serviço de IA local não está disponível.",
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="A geração da resposta excedeu o tempo permitido.",
        )

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Erro no serviço de IA (HTTP {exc.response.status_code}).",
        )

    finally:
        if acquired:
            inference_limit.release()
