"""Rotas locais de documentos do Nexora AI.

Autoria: Allan de Melo Correa
https://github.com/allancorreaz/Nexora-AI

Sem autenticacao: somente para desenvolvimento local em loopback.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.web_source import WebSourceError, preview_public_article
from app.document_processor import DocumentProcessingError
from app.document_repository import (
    DEFAULT_DB_PATH,
    DOCUMENT_CATEGORIES,
    DocumentRepository,
    DuplicateDocumentError,
    StoredDocument,
)


router = APIRouter(prefix="/api/documents", tags=["Documentos"])
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def get_document_repository() -> DocumentRepository:
    return DocumentRepository(DEFAULT_DB_PATH)


class DocumentSummary(BaseModel):
    id: str
    filename: str
    category: str
    system: str
    extension: str
    sha256: str
    character_count: int
    created_at: str
    source_url: str = ""


class DocumentDetail(DocumentSummary):
    text: str


def _summary(document: StoredDocument) -> DocumentSummary:
    values = asdict(document)
    values.pop("text")
    return DocumentSummary(**values)


class WebPreviewRequest(BaseModel):
    url: str


@router.post("/web/preview")
async def preview_web_document(request: WebPreviewRequest):
    """Consulta uma pagina publica permitida, sem salva-la na base."""
    try:
        return await preview_public_article(request.url)
    except WebSourceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/web/import", response_model=DocumentSummary, status_code=201)
async def import_web_document(
    request: WebPreviewRequest,
    repository: DocumentRepository = Depends(get_document_repository),
):
    """Importa um artigo publico individual, sem varrer outros enderecos."""
    try:
        article = await preview_public_article(request.url)
        if article["truncated"]:
            raise WebSourceError("O artigo excede o limite de extracao.")
        document = repository.add_web(
            url=str(article["url"]),
            title=str(article["title"]),
            text=str(article["text"]),
        )
    except DuplicateDocumentError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (WebSourceError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _summary(document)


@router.post("", response_model=DocumentSummary, status_code=201)
async def create_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    system: str = Form(""),
    repository: DocumentRepository = Depends(get_document_repository),
):
    """Importa texto extraido e metadados; nao guarda o arquivo original."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Informe o nome do arquivo.")
    if category not in DOCUMENT_CATEGORIES:
        raise HTTPException(status_code=422, detail="Categoria invalida.")

    try:
        content = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 5 MB.")

    try:
        document = repository.add(
            file.filename,
            content,
            category=category,
            system=system,
        )
    except DuplicateDocumentError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (DocumentProcessingError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return _summary(document)


@router.get("", response_model=list[DocumentSummary])
def list_documents(
    category: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    repository: DocumentRepository = Depends(get_document_repository),
):
    if category is not None and category not in DOCUMENT_CATEGORIES:
        raise HTTPException(status_code=422, detail="Categoria invalida.")
    return [_summary(doc) for doc in repository.list(category=category, limit=limit)]


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: str,
    repository: DocumentRepository = Depends(get_document_repository),
):
    document = repository.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return DocumentDetail(**asdict(document))


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: str,
    repository: DocumentRepository = Depends(get_document_repository),
):
    if not repository.delete(document_id):
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return None
