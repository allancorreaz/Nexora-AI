"""Orquestrador de verificacoes do Nexora AI.

Autor: Allan de Melo Correa
https://github.com/allancorreaz/Nexora-AI

Uso (na raiz do repositorio):
    backend/.venv/Scripts/python.exe tests/run_tests.py --profile quick
    backend/.venv/Scripts/python.exe tests/run_tests.py --profile full
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
PYTHON = (
    BACKEND / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
)


def build_checks(profile: str) -> list[tuple[str, Path, list[str]]]:
    """Registra somente validacoes que realmente existem hoje."""
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if npm is None:
        raise RuntimeError("npm nao encontrado no PATH.")

    if not PYTHON.is_file():
        raise RuntimeError(
            f"Ambiente Python nao encontrado: {PYTHON}. "
            "Crie o venv e instale backend/requirements.txt."
        )

    backend = (
        "Backend: testes automatizados",
        BACKEND,
        [str(PYTHON), "-m", "unittest", "discover", "-s", "tests", "-v"],
    )
    typecheck = ("Frontend: TypeScript", FRONTEND, [npm, "run", "typecheck"])
    lint = ("Frontend: ESLint", FRONTEND, [npm, "run", "lint"])
    formatting = ("Frontend: Prettier", FRONTEND, [npm, "run", "format:check"])
    build = ("Frontend: build de producao", FRONTEND, [npm, "run", "build"])
    audit = ("Dependencias: auditoria de producao", FRONTEND, [npm, "audit", "--omit=dev"])

    profiles = {
        "backend": [backend],
        "frontend": [typecheck, lint, formatting],
        "quick": [backend, typecheck, lint],
        "security": [audit],
        "full": [backend, typecheck, lint, formatting, build, audit],
    }
    return profiles[profile]


def main() -> int:
    parser = argparse.ArgumentParser(description="Validador do Nexora AI")
    parser.add_argument(
        "--profile",
        choices=["quick", "full", "backend", "frontend", "security"],
        default="quick",
        help="Conjunto de verificacoes a executar (padrao: quick).",
    )
    args = parser.parse_args()

    try:
        checks = build_checks(args.profile)
    except RuntimeError as exc:
        print(f"[ERRO] {exc}", flush=True)
        return 2

    results: list[tuple[str, str, float]] = []
    started = time.perf_counter()

    for index, (name, directory, command) in enumerate(checks, start=1):
        print(f"\n{'=' * 64}", flush=True)
        print(f"[{index}/{len(checks)}] {name}", flush=True)
        print(f"{'=' * 64}", flush=True)
        began = time.perf_counter()
        try:
            code = subprocess.run(command, cwd=directory, check=False).returncode
            status = "OK" if code == 0 else f"FALHOU (codigo {code})"
        except OSError as exc:
            status = f"ERRO ({exc})"
        results.append((name, status, time.perf_counter() - began))

    print("\nRESUMO DA VALIDACAO", flush=True)
    for name, status, duration in results:
        print(f"  {status:20} {duration:6.1f}s  {name}", flush=True)
    print(f"Duracao total: {time.perf_counter() - started:.1f}s", flush=True)

    failures = sum(1 for _, status, _ in results if status != "OK")
    print(
        f"Resultado: {len(results) - failures}/{len(results)} verificacoes aprovadas.",
        flush=True,
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
