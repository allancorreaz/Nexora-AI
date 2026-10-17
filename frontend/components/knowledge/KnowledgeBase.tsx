"use client";

/*
 * Nexora AI — projeto criado por Allan de Melo Correa.
 * Origem: https://github.com/allancorreaz/Nexora-AI
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpenText,
  CheckCircle2,
  FileText,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Category = "transcricao" | "documentacao" | "outro";
type DocumentSummary = {
  id: string;
  filename: string;
  category: Category;
  system: string;
  extension: string;
  sha256: string;
  character_count: number;
  created_at: string;
};
type DocumentDetail = DocumentSummary & { text: string };
type ApiError = { detail?: string };

const categories: { value: Category; label: string }[] = [
  { value: "transcricao", label: "Transcrição" },
  { value: "documentacao", label: "Documentação" },
  { value: "outro", label: "Outro" },
];

async function getError(response: Response): Promise<string> {
  const data: ApiError | null = await response.json().catch(() => null);
  if (typeof data?.detail === "string") return data.detail;
  return `Falha na comunicação com a API (HTTP ${response.status}).`;
}

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selected, setSelected] = useState<DocumentDetail | null>(null);
  const [category, setCategory] = useState<Category>("transcricao");
  const [filter, setFilter] = useState<Category | "todas">("todas");
  const [system, setSystem] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/documents?limit=500`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await getError(response));
      const data: DocumentSummary[] = await response.json();
      setDocuments(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os documentos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // O carregamento inicial atualiza estado apenas apos a operacao assincrona.
    // AbortController impede atualizar o componente apos desmontagem.
    const controller = new AbortController();

    void fetch(`${API_URL}/api/documents?limit=500`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getError(response));
        return (await response.json()) as DocumentSummary[];
      })
      .then((data) => {
        if (!controller.signal.aborted) setDocuments(data);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar os documentos.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo excede o limite de 5 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("system", system.trim());
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await getError(response));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice(
        "Documento importado com sucesso. O texto está salvo na base local.",
      );
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha ao importar documento.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function openDocument(id: string) {
    setOpeningId(id);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/documents/${encodeURIComponent(id)}`,
      );
      if (!response.ok) throw new Error(await getError(response));
      setSelected((await response.json()) as DocumentDetail);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível abrir o documento.",
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteDocument(document: DocumentSummary) {
    const confirmed = window.confirm(
      `Excluir "${document.filename}" da base local? Esta operação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    setDeletingId(document.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `${API_URL}/api/documents/${encodeURIComponent(document.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(await getError(response));
      if (selected?.id === document.id) setSelected(null);
      setNotice("Documento excluído da base local.");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível excluir o documento.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const visible =
    filter === "todas"
      ? documents
      : documents.filter((document) => document.category === filter);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 px-6">
        <div className="flex items-center gap-3">
          <BookOpenText
            size={19}
            className="text-zinc-400"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">Base de conhecimento</span>
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
            Local
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          title="Atualizar documentos"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Atualizar
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-7">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Nexora / Documentos
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sua biblioteca de conhecimento
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Importe transcrições, manuais e documentos. O conteúdo extraído
              fica no SQLite do seu computador. A pesquisa por IA com fontes
              será adicionada em uma próxima etapa.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              {notice}
            </div>
          )}

          <form
            onSubmit={handleUpload}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
                <Upload size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Importar documento</h2>
                <p className="text-xs text-zinc-400">
                  TXT, MD, PDF ou DOCX · Máximo 5 MB
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-medium text-zinc-300">
                Categoria
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as Category)
                  }
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium text-zinc-300">
                Sistema ou assunto
                <input
                  value={system}
                  maxLength={120}
                  onChange={(event) => setSystem(event.target.value)}
                  placeholder="Ex.: ERP, Procedimentos, Estudos"
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 px-4 py-7 text-center text-sm text-zinc-400 transition-colors hover:border-zinc-500">
              <FileText size={20} aria-hidden="true" />
              <span className="min-w-0 truncate">
                {file ? file.name : "Clique para selecionar um documento"}
              </span>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                Importe somente documentos de teste ou autorizados.
              </p>
              <Button
                type="submit"
                disabled={!file || uploading}
                className="h-10 gap-2 bg-zinc-100 px-4 text-zinc-950 hover:bg-zinc-300"
              >
                {uploading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {uploading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">Documentos cadastrados</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {documents.length} documento(s) na base local
                </p>
              </div>
              <select
                aria-label="Filtrar categoria"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as Category | "todas")
                }
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-300"
              >
                <option value="todas">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-400">
                <LoaderCircle size={17} className="animate-spin" /> Carregando
                documentos...
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <FolderOpen
                  size={27}
                  className="text-zinc-600"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-zinc-300">
                  Nenhum documento encontrado
                </p>
                <p className="text-xs text-zinc-500">
                  Importe um arquivo acima para começar.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {visible.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 sm:flex">
                      <FileText size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => void openDocument(document.id)}
                        disabled={openingId === document.id}
                        className="block max-w-full truncate text-left text-sm font-medium text-zinc-200 hover:underline"
                      >
                        {document.filename}
                      </button>
                      <p className="mt-1 text-xs text-zinc-500">
                        {
                          categories.find(
                            (item) => item.value === document.category,
                          )?.label
                        }{" "}
                        · {document.character_count.toLocaleString("pt-BR")}{" "}
                        caracteres · {readableDate(document.created_at)}
                        {document.system ? ` · ${document.system}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Excluir documento"
                      aria-label={`Excluir ${document.filename}`}
                      disabled={deletingId === document.id}
                      onClick={() => void deleteDocument(document)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      {deletingId === document.id ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && (
            <section
              aria-label="Conteúdo do documento"
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {selected.filename}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Texto extraído ·{" "}
                    {selected.character_count.toLocaleString("pt-BR")}{" "}
                    caracteres
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  aria-label="Fechar documento"
                >
                  <X size={17} />
                </Button>
              </div>
              <pre className="max-h-96 overflow-auto p-5 font-sans text-sm leading-7 whitespace-pre-wrap text-zinc-300">
                {selected.text}
              </pre>
            </section>
          )}
          <p className="pb-8 text-xs leading-5 text-zinc-500">
            Ambiente local de desenvolvimento. Esta área ainda não possui
            autenticação ou controle de permissões; não exponha a API à internet
            e não importe informações confidenciais.
          </p>
        </div>
      </div>
    </section>
  );
}
