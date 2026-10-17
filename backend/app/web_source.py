"""Leitura segura de artigos publicos da ajuda Alterdata para testes.

Nexora AI - Allan de Melo Correa.
Somente dominios e caminhos explicitamente permitidos.
Nao tenta acessar sessoes autenticadas nem contornar controles de acesso.
"""
from html.parser import HTMLParser
from urllib.parse import urlsplit

import httpx


MAX_WEB_BYTES = 1_500_000
MAX_EXTRACTED_CHARS = 150_000
ALLOWED_HOSTS = frozenset({"ajuda.alterdata.com.br"})
ALLOWED_PATH_PREFIXES = ("/bimerbase/", "/bimer/")


class WebSourceError(ValueError):
    pass


class _ArticleTextParser(HTMLParser):
    BLOCK_TAGS = frozenset({
        "p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6",
        "section", "tr", "blockquote", "ul", "ol",
    })
    SKIP_TAGS = frozenset({"script", "style", "svg", "noscript", "nav", "footer", "header"})

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.fragments: list[str] = []
        self.title_fragments: list[str] = []
        self.main_fragments: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        self.stack.append(tag)
        if tag in self.BLOCK_TAGS and not any(t in self.SKIP_TAGS for t in self.stack):
            self._append("\n")
        if tag == "br":
            self._append("\n")

    def handle_startendtag(self, tag: str, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str):
        if tag in self.BLOCK_TAGS:
            self._append("\n")
        if tag in self.stack:
            while self.stack:
                last = self.stack.pop()
                if last == tag:
                    break

    def _append(self, value: str):
        if not any(t in self.SKIP_TAGS for t in self.stack):
            self.fragments.append(value)
            if "main" in self.stack or "article" in self.stack:
                self.main_fragments.append(value)

    def handle_data(self, data: str):
        if "title" in self.stack:
            self.title_fragments.append(data)
            return
        if not data.strip():
            return
        self._append(data.strip() + " ")

    def result(self) -> tuple[str, str]:
        def clean(fragments):
            lines = [" ".join(part.split()) for part in "".join(fragments).splitlines()]
            return "\n".join(line for line in lines if line).strip()
        return clean(self.title_fragments), clean(self.main_fragments or self.fragments)


def validate_public_url(url: str) -> str:
    if not isinstance(url, str) or len(url) > 2048:
        raise WebSourceError("URL invalida.")
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError as exc:
        raise WebSourceError("URL invalida.") from exc
    host = (parts.hostname or "").lower()
    if (
        parts.scheme != "https"
        or host not in ALLOWED_HOSTS
        or port not in (None, 443)
        or parts.username is not None
        or parts.password is not None
        or not any(parts.path.startswith(prefix) for prefix in ALLOWED_PATH_PREFIXES)
    ):
        raise WebSourceError(
            "Use um artigo HTTPS publico de ajuda.alterdata.com.br/bimerbase/ ou /bimer/."
        )
    return url


async def preview_public_article(url: str) -> dict[str, object]:
    url = validate_public_url(url)
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
            follow_redirects=False,
            trust_env=False,
        ) as client:
            async with client.stream("GET", url, headers={"Accept": "text/html"}) as response:
                if response.is_redirect:
                    raise WebSourceError("O artigo redirecionou para outra pagina; acesso nao realizado.")
                response.raise_for_status()
                mime = response.headers.get("content-type", "").lower()
                if "text/html" not in mime:
                    raise WebSourceError("A URL nao retornou uma pagina HTML.")
                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > MAX_WEB_BYTES:
                        raise WebSourceError("A pagina excede o limite de leitura de 1,5 MB.")
                    chunks.append(chunk)
    except WebSourceError:
        raise
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise WebSourceError("O artigo exige autorizacao; faca a importacao pela via autenticada permitida.") from exc
        raise WebSourceError(f"Falha HTTP {exc.response.status_code} ao consultar a pagina.") from exc
    except httpx.RequestError as exc:
        raise WebSourceError("Nao foi possivel acessar a pagina de ajuda.") from exc

    raw = b"".join(chunks)
    parser = _ArticleTextParser()
    parser.feed(raw.decode("utf-8", errors="replace"))
    title, text = parser.result()
    if len(text) < 40:
        raise WebSourceError("Nao foi encontrado texto suficiente. A pagina pode carregar conteudo por JavaScript.")
    return {
        "url": url,
        "title": title or "Artigo sem titulo",
        "text": text[:MAX_EXTRACTED_CHARS],
        "characters": len(text),
        "truncated": len(text) > MAX_EXTRACTED_CHARS,
        "saved": False,
    }
