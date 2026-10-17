# Automacao de qualidade — Nexora AI

**Projeto criado por Allan de Melo Correa.**

O projeto usa um orquestrador unico em `tests/run_tests.py`, executado a partir da raiz do repositorio. Ele invoca verificacoes existentes sem copiar nem substituir os testes originais: os testes Python continuam em `backend/tests/` e futuras suites do frontend ficarao proximas de seus componentes ou em `frontend/tests/`.

## Como executar no Windows (PowerShell)

```powershell
cd C:\Users\allan\projetos\nexora-ai

# Durante a implementacao: rapido
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile quick

# Antes de commits importantes e releases
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile full

# Rodar apenas uma area
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile backend
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile frontend
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile security
```

No Linux/macOS substitua o executavel Python por `./backend/.venv/bin/python`.

### Perfis implementados

| Perfil | Comandos executados |
| --- | --- |
| `backend` | `python -m unittest discover -s tests -v` no backend |
| `frontend` | TypeScript, ESLint e Prettier |
| `security` | `npm audit --omit=dev` |
| `quick` | **Formata automaticamente** o frontend com Prettier, depois executa testes backend, TypeScript e ESLint |
| `full` | Todos os testes backend, TypeScript, ESLint, Prettier, build Next.js e auditoria de producao |

O perfil `quick` **modifica os arquivos de codigo quando o Prettier encontra diferencas**. Confira `git diff` e `git status` antes de realizar commits. O perfil `full` **nao aplica formatacao**, apenas verifica se o codigo ja esta formatado, sendo o perfil indicado para CI.\n\nO runner executa todas as verificacoes do perfil, imprime um resumo e retorna **codigo de saida diferente de zero** se qualquer verificacao falhar. Isso permite integrar o mesmo comando a CI/CD futuramente.

**Prerequisitos:** virtualenv configurado com `backend/requirements.txt`, Node.js e dependencias instaladas em `frontend/` com `npm install`. O perfil `full` pode consumir mais memoria e CPU devido ao build. A auditoria do npm usa a rede e pode falhar por indisponibilidade do registro ou vulnerabilidades reportadas; isso nao equivale necessariamente a uma falha de codigo.

## Plano de testes em evolucao (a implementar)

A automacao deve aumentar **conforme as funcionalidades existirem**; nao consideramos testes de modulos inexistentes como aprovados.

| Area futura | Cenarios prioritarios | Tipo |
| --- | --- | --- |
| Documentos | validacao MIME/assinaturas, extensoes, limites, corrupcao, PDF com senha, OCR, metadados e arquivos maliciosos | unitario/integracao |
| Armazenamento | importacao, deduplicacao, atualizacao, exclusao, backups e restauracao | integracao |
| Indexacao e RAG | chunking, embeddings, busca, ranking, referencias e ausencia de fontes | unitario/integracao/avaliacao |
| Regras de conhecimento | prioridade de transcricoes sobre documentos de telas, fonte divergente, regras de negocio, tarefas pendentes | avaliacao com casos conhecidos |
| Respostas de IA | pergunta sem fonte, abstencao, prompt injection em documentos, qualidade, latencia e consumo de recursos | avaliacao/performance |
| Interface | envio, historico, upload, mensagens de erro, responsividade, acessibilidade e navegacao | componentes/E2E |
| Autenticacao | permissoes por usuario, isolamento de dados, negacao de acesso e sessoes | seguranca/integracao |
| Operacao | fila, concorrencia, limites de tempo, carga, logs sem dados privados e resiliencia | carga/observabilidade |
| Implantacao | variaveis de ambiente, build limpo, ambiente isolado, seguranca de dependencias | CI/CD |

**Importante:** testes de carga, integracao com modelo local, OCR, avaliacao de respostas e outros cenarios pesados devem ser separados do perfil rapido para preservar recursos do computador. Antes de considerar o produto pronto para uso corporativo, sera necessario testar tambem a seguranca e as permissoes.

## Privacidade

Nao salve transcricoes privadas, documentos corporativos, credenciais nem bases locais no Git. Use dados sinteticos ou anonimizados nas suites automatizadas. Os caminhos de dados locais estao listados no `.gitignore` da raiz; confira tambem arquivos ja rastreados com `git ls-files`.
