# Nexora AI — projeto criado por Allan de Melo Correa.
# Origem: https://github.com/allancorreaz/Nexora-AI

import asyncio
from time import perf_counter

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.document_processor import DocumentProcessingError, extract_text
from app.document_routes import router as document_router

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

app.include_router(document_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
DOCUMENT_PREVIEW_CHARACTERS = 5000

inference_limit = asyncio.Semaphore(
    max(1, settings.ai_max_concurrent_requests)
)


class DocumentPreviewResponse(BaseModel):
    filename: str
    characters: int
    preview: str
    truncated: bool
    saved: bool = False


@app.post("/api/documents/preview", response_model=DocumentPreviewResponse)
async def preview_document(file: UploadFile = File(...)):
    """Extrai uma previa de texto sem guardar o arquivo ou indexa-lo."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Informe o nome do arquivo.")

    # O tamanho e limitado durante a leitura para evitar carregar
    # uploads arbitrariamente grandes na memoria da aplicacao.
    try:
        content = await file.read(MAX_DOCUMENT_BYTES + 1)
    finally:
        await file.close()

    if len(content) > MAX_DOCUMENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Arquivo excede o limite de 5 MB.",
        )

    try:
        text = extract_text(file.filename, content)
    except DocumentProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Nome fornecido pelo cliente nao deve conter caminhos locais.
    safe_filename = file.filename.replace("\\", "/").rsplit("/", 1)[-1]
    return DocumentPreviewResponse(
        filename=safe_filename,
        characters=len(text),
        preview=text[:DOCUMENT_PREVIEW_CHARACTERS],
        truncated=len(text) > DOCUMENT_PREVIEW_CHARACTERS,
    )


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class ChatResponse(BaseModel):
    response: str
    model: str
    generation_ms: int


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "nexora-ai-backend",
        "model": settings.ai_model,
    }


@app.get("/health/ai")
async def health_ai():
    """Verifica se o serviço Ollama responde e se o modelo está instalado."""
    if settings.ai_provider != "ollama":
        raise HTTPException(
            status_code=503,
            detail="Verificação de disponibilidade não configurada para este provedor.",
        )

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"{settings.ai_base_url.rstrip('/')}/api/tags"
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Serviço de IA indisponível.",
        )

    if not isinstance(data, dict) or not isinstance(data.get("models"), list):
        raise HTTPException(
            status_code=503,
            detail="Resposta de disponibilidade da IA inválida.",
        )

    installed_models = {
        model.get("name")
        for model in data["models"]
        if isinstance(model, dict)
    }

    if settings.ai_model not in installed_models:
        raise HTTPException(
            status_code=503,
            detail="Modelo configurado não está instalado no Ollama.",
        )

    return {
        "status": "ready",
        "provider": settings.ai_provider,
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
        started_at = perf_counter()
        response = await provider.generate(request.messages)
        generation_ms = round((perf_counter() - started_at) * 1000)

        return ChatResponse(
            response=response,
            model=settings.ai_model,
            generation_ms=generation_ms,
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
