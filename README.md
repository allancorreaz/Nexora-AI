# Nexora AI

**Inteligência que conecta conhecimento.**

Assistente de IA local, construído com **Next.js**, **FastAPI** e **Ollama**. O objetivo é transformar documentos, treinamentos e procedimentos em respostas fundamentadas, por meio de uma futura base de conhecimento com RAG.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.1-009688?logo=fastapi&logoColor=white)
![Ollama](https://img.shields.io/badge/IA-Ollama-555555)
![Status](https://img.shields.io/badge/status-MVP%20em%20desenvolvimento-orange)

**Criado e desenvolvido por [Allan de Melo Correa](https://github.com/allancorreaz) · [GitHub @allancorreaz](https://github.com/allancorreaz)**

> **Estado atual:** chat com IA local funcional e testes básicos da API. **Ainda não** há upload de documentos, RAG, autenticação nem capacidade multiusuário validada.

## Por que este projeto existe?

Em muitas equipes, o conhecimento operacional fica espalhado por documentos, treinamentos gravados e procedimentos internos. Localizar a orientação correta pode exigir tempo e depender de quem participou de uma reunião.

O **Nexora AI** nasce como um projeto pessoal de engenharia de software para experimentar uma solução de consulta em linguagem natural, com execução local e arquitetura que permita evoluir os modelos de IA. A ideia é facilitar o acesso ao conhecimento **sem substituir as fontes originais e a validação humana**.

### Onde poderá ser utilizado

- **Treinamento e suporte interno:** consultar orientações e procedimentos com referência às fontes (recurso planejado).
- **Manuais de sistemas e operações:** localizar etapas em documentos técnicos (recurso planejado).
- **Onboarding de equipes:** reduzir o tempo de busca por informações frequentes (recurso planejado).
- **Laboratório local de IA:** experimentar modelos gratuitos e comparar desempenho (já possível no chat atual).

A base de conhecimento e as citações documentais **ainda não estão implementadas**. Nenhuma documentação corporativa faz parte deste repositório.

## Visão geral

O Nexora AI é um projeto de assistente de conhecimento concebido para uso local e, futuramente, ambientes organizacionais **autorizados**. É desenvolvido de forma independente do modelo: a API conversa com um provedor configurável, enquanto a interface não precisa conhecer detalhes do Ollama.

### O que já funciona

- Interface de chat responsiva com **Next.js, TypeScript, Tailwind CSS, shadcn/ui e Lucide**.
- Criação, seleção, exclusão e histórico de conversas em **localStorage**.
- Envio de mensagens ao **FastAPI** e respostas reais de um modelo executado pelo **Ollama**.
- Indicador de geração de resposta, bloqueio temporário de novos envios e tratamento básico de erros.
- Limite inicial de inferências simultâneas **por processo** na API.
- Testes automatizados básicos com `unittest` e `httpx`.
- Renderização de respostas em **Markdown**, com metadados de modelo e tempo de geração.
- Extração de TXT, MD, PDF e DOCX e endpoint de **prévia temporária** do conteúdo, sem armazenar ou indexar documentos.

## Arquitetura atual

```mermaid
flowchart TD
    U[Usuário no navegador] --> F[Frontend Next.js :3000]
    F -->|POST /api/chat| API[FastAPI :8000]
    API -->|Validação e limite de concorrência| P[Camada de provedor de IA]
    P -->|HTTP /api/chat| O[Ollama :11434]
    O --> M[Modelo local Qwen3 1.7B]
    M --> O --> P --> API --> F
    F <-->|Histórico local| L[(localStorage)]
```

### Fluxo de uma pergunta

```mermaid
sequenceDiagram
    actor Pessoa as Usuário
    participant Web as Next.js
    participant API as FastAPI
    participant LLM as Ollama / Qwen3
    Pessoa->>Web: Envia pergunta
    Web->>Web: Atualiza histórico local
    Web->>API: POST /api/chat (mensagens)
    API->>API: Valida entrada e aguarda vaga
    API->>LLM: Solicita geração
    LLM-->>API: Resposta completa
    API-->>Web: JSON com resposta e modelo
    Web-->>Pessoa: Exibe resposta e salva no histórico
```

> Atualmente as respostas são retornadas **ao final da geração**, sem streaming. O histórico fica no navegador e não é sincronizado entre usuários ou dispositivos.

## Tecnologias

| Camada | Tecnologia | Situação |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS | Funcional |
| Componentes | shadcn/ui, Base UI, Lucide | Funcional |
| Backend | Python 3.12, FastAPI, Uvicorn, httpx | Funcional |
| Inferência | Ollama + Qwen3 1.7B | Funcional localmente |
| Testes | unittest + ASGITransport | Testes automatizados de API e documentos |
| Banco de dados | PostgreSQL + pgvector | Planejado |
| Busca documental | Embeddings + RAG | Planejado |
| Implantação | Contêineres e infraestrutura | Planejado |

## Como executar localmente

### Pré-requisitos

- Node.js compatível com Next.js 16 e npm.
- Python 3.12.
- [Ollama](https://ollama.com/) instalado e em execução.
- Git.

### 1. Instalar o modelo

```powershell
ollama pull qwen3:1.7b
ollama list
```

### 2. Preparar o backend

Na raiz do projeto:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

O arquivo `backend/.env` é local e ignorado pelo Git. Para usar outro modelo Ollama, ajuste `AI_MODEL` e faça o respectivo `ollama pull`. Ajuste `AI_BASE_URL` caso o serviço rode em outra máquina.

Inicie a API em **um terminal**:

```powershell
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentação interativa: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Iniciar o frontend

Em **outro terminal**, a partir da raiz:

```powershell
cd frontend
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

A URL padrão da API no frontend é `http://127.0.0.1:8000`. Para alterá-la, configure `NEXT_PUBLIC_API_URL` no ambiente do Next.js.

## Endpoints

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/health` | Confirma que a API está em execução; **não** valida o Ollama |
| `GET` | `/health/ai` | Verifica comunicação com o Ollama e presença do modelo configurado; responde HTTP 503 se indisponível |
| `POST` | `/api/chat` | Envia até 30 mensagens e recebe uma resposta completa |
| `POST` | `/api/documents/preview` | Recebe um arquivo de até 5 MB, extrai texto e devolve uma prévia sem salvar ou indexar |

Exemplo do chat:

```json
{
  "messages": [
    { "role": "user", "content": "Explique o que é um ERP." }
  ]
}
```

### Experimentar a prévia de documentos

Com a API em execução, abra [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs), escolha `POST /api/documents/preview`, clique em **Try it out**, selecione um arquivo TXT, MD, PDF ou DOCX e execute. O retorno informa o nome, número de caracteres, uma prévia de até 5.000 caracteres e `saved: false`.

**Atenção:** esta etapa não oferece autenticação, banco de documentos nem pesquisa em arquivos. O upload é lido temporariamente para extrair texto, não é gravado pela aplicação nem adicionado à base de conhecimento. O limite de 5 MB é verificado na leitura; ainda não existe uma proteção completa de infraestrutura contra requisições multipart excessivas ou documentos maliciosos. Use apenas com arquivos confiáveis em ambiente local.

## Executar testes

Na raiz do projeto:

```powershell
cd backend
./.venv/Scripts/python.exe -m unittest discover -s tests -v
```

No frontend:

```powershell
cd frontend
npm run typecheck
npm run lint
```

### Orquestração automatizada de testes

O comando central `tests/run_tests.py` reúne as verificações do backend e frontend. Execute na raiz do repositório:

```powershell
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile quick
.\backend\.venv\Scripts\python.exe tests\run_tests.py --profile full
```

O perfil `quick` **formata automaticamente** o frontend e depois verifica testes Python, TypeScript e ESLint. O `full` **não modifica arquivos**: verifica também a formatação, executa o build do Next.js e audita as dependências de produção. Confira `git diff` antes de registrar alterações. Consulte [tests/README.md](tests/README.md) para os perfis completos e o plano de testes futuros. O resultado do perfil `full` precisa ser validado na máquina de desenvolvimento; ele não substitui testes de carga e segurança que ainda serão implementados.

### CI — validação automática no GitHub

O workflow [Nexora AI - Qualidade](.github/workflows/quality.yml) é acionado em pushes e pull requests para `main`, ou manualmente pelo GitHub Actions. Ele executa os testes Python e, separadamente, TypeScript, ESLint, Prettier (somente verificação), build e auditoria de dependências de produção. **Não utiliza Ollama** e não executa testes que precisem de modelos locais. Consulte a aba **Actions** para verificar se cada execução foi concluída com sucesso.

## Próximas entregas

```mermaid
flowchart LR
    A[Chat local funcional] --> B[Streaming e controles de geração]
    B --> C[Upload e extração de documentos]
    C --> D[Embeddings e armazenamento]
    D --> E[Busca RAG com fontes]
    E --> F[Autenticação e permissões]
    F --> G[Testes de carga e implantação]
```

### Como deverá funcionar a base de conhecimento (planejado)

```mermaid
flowchart LR
    D[Documentos e transcrições] --> X[Extração e divisão em trechos]
    X --> V[(Banco vetorial)]
    Q[Pergunta] --> S[Busca semântica]
    V --> S
    S --> C[Trechos relevantes com referências]
    C --> L[Modelo de IA]
    Q --> L
    L --> R[Resposta com fontes]
```

O fluxo planejado deverá priorizar **transcrições de treinamento** para regras operacionais, complementar com **documentações de telas** e indicar quando não houver fonte suficiente. Essa recuperação documental ainda não está implementada.

## Limites e segurança

- O projeto é um **MVP de desenvolvimento**, não uma solução pronta para produção corporativa.
- O limite de inferências atual é **por processo**, não uma fila distribuída. O número de usuários simultâneos suportado ainda não foi medido.
- Não inclua documentos confidenciais ou dados corporativos sem autorização explícita e controles de acesso apropriados.
- Evite expor o Ollama ou o FastAPI diretamente na internet sem autenticação, isolamento e segurança adequados.
- A troca do **modelo de geração** é configurável no provedor Ollama; trocar de serviço de inferência pode exigir um novo adaptador. No futuro, trocar modelos de **embeddings** poderá exigir reindexar os documentos.

## Autoria e atribuição

**Autor e criador do projeto: Allan de Melo Correa** ([GitHub: @allancorreaz](https://github.com/allancorreaz)).

O Nexora AI é um projeto pessoal e independente, criado para aprendizado, desenvolvimento de produto e portfólio profissional. A autoria refere-se ao código e à organização original do projeto; frameworks, bibliotecas e modelos de IA utilizados são tecnologias de terceiros, sujeitos às próprias licenças e condições de uso.

Este repositório não concede, por si só, autorização para utilizar dados, marcas, documentos ou infraestrutura de terceiros. Uma eventual implantação corporativa deverá ocorrer com autorização e avaliação de segurança e de direitos aplicáveis.

**Licenciamento:** ainda não foi definida uma licença de distribuição do código do Nexora AI. A atribuição de autoria não substitui a escolha de uma licença, que será feita separadamente.

## Desenvolvimento

Projeto pessoal e independente, em evolução contínua. Alterações são organizadas em commits [Conventional Commits](https://www.conventionalcommits.org/), com entregas pequenas e verificáveis.

---

**Nexora AI — Inteligência que conecta conhecimento.**
