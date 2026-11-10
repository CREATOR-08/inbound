# Inbound AI --- Frontend

An AI-powered email workspace that helps users understand, organize, and
act on their Gmail inbox through a modern web interface and a
context-aware AI assistant.

> **Repository:** Frontend\
> **Backend:** [Inbound AI Backend](https://github.com/CREATOR-08/inbound_backend) --- replace this
> with the actual backend repository URL\
> **Status:** Active development

## Overview

Inbound AI brings email, AI-assisted workflows, and calendar actions
into one workspace. The frontend provides the inbox experience,
authentication, email interactions, and a persistent assistant
interface. Long-running Gmail synchronization and AI jobs are handled
asynchronously by backend workers.

### Core capabilities

-   Gmail-connected email workspace.
-   Inbox browsing with email details and actions.
-   Persistent AI assistant panel with conversation history.
-   Context-aware assistant requests using the current inbox filter and
    selected email.
-   AI-assisted email understanding, summaries, and reply drafting.
-   Calendar scheduling proposals routed through the existing scheduling
    UI.
-   Human confirmation before sensitive actions such as sending or
    archiving.
-   Responsive interface built for a focused email workflow.

Some capabilities and workflows are still under active development.
Refer to the roadmap for planned work.

## Product architecture

The frontend communicates with the FastAPI backend. It does **not** call
the background workers directly. The backend and workers coordinate
through shared Redis queues and PostgreSQL.

``` mermaid
flowchart TD
    U[User] --> FE[Next.js Frontend]
    FE --> AUTH[Better Auth]
    FE --> API[FastAPI Backend]
    API --> DB[(PostgreSQL / Neon)]
    API --> Q[(Redis / Upstash)]
    Q --> GW[Gmail Worker]
    Q --> AW[AI Worker]
    GW --> G[ Gmail API ]
    AW --> AI[Gemini / LangGraph]
    GW --> DB
    AW --> DB
    API --> CAL[Google Calendar API]
    DB --> FE
```

### Assistant interaction flow

``` mermaid
flowchart TD
    U[User message] --> PANEL[Persistent assistant panel]
    PANEL --> CTX[Collect UI context]
    CTX --> REQ[Authenticated assistant API request]
    REQ --> GRAPH[Backend LangGraph assistant]
    GRAPH --> ROUTE{Intent / request type}
    ROUTE -->|Question| ANSWER[Generate response]
    ROUTE -->|Email data query| SEARCH[Search stored email data]
    ROUTE -->|UI action| ACTION[Return supported UI action]
    ROUTE -->|Multi-step workflow| PLAN[Create workflow plan]
    PLAN --> APPROVAL[Request user approval]
    APPROVAL -->|Approved| EXEC[Execute approved steps]
    APPROVAL -->|Not approved| WAIT[Wait for user]
    ANSWER --> RESP[Structured response / stream]
    SEARCH --> RESP
    ACTION --> RESP
    EXEC --> RESP
    RESP --> PANEL
```

The assistant can use the currently selected email and inbox-filter
context. Sensitive operations are designed around explicit user approval
rather than silently executing consequential actions.

## Tech stack

  Area                    Technology
  ----------------------- ---------------------------
  Framework               Next.js (App Router)
  Language                TypeScript
  UI                      React, Tailwind CSS
  Authentication          Better Auth, Google OAuth
  Backend communication   Typed API client / REST
  Email provider          Gmail API through backend
  AI orchestration        LangGraph on backend
  AI model                Gemini through backend
  Deployment              Vercel

## Assistant experience

The assistant is designed as a persistent workspace rather than a
one-off chat box.

-   Maintains conversation history in the UI.
-   Sends bounded conversation context with requests.
-   Includes the current inbox filter and selected email as context.
-   Supports questions, email-data queries, supported UI actions, and
    multi-step workflows.
-   Uses structured action responses so the frontend can safely
    interpret navigation, compose, and other supported UI actions.
-   Routes calendar proposals into the existing scheduling experience.
-   Supports approval and confirmation flows for sensitive workflow
    steps.

The backend is the source of truth for authorization and data access.
The frontend must not trust a user ID or permissions supplied by the
browser.

## Authentication and API configuration

Create a local `.env.local` file. Never commit it.

Typical variables used by the frontend deployment:

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `BETTER_AUTH_URL`                   Base URL of the frontend Better
                                      Auth server

  `BETTER_AUTH_SECRET`                Secret used by Better Auth

  `DATABASE_URL`                      PostgreSQL connection used by
                                      Better Auth, if configured in this
                                      repository

  `GOOGLE_CLIENT_ID`                  Google OAuth client ID

  `GOOGLE_CLIENT_SECRET`              Google OAuth client secret

  `NEXT_PUBLIC_API_URL`               Base URL of the FastAPI backend
  -----------------------------------------------------------------------

Example local configuration:

``` env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_a_long_random_secret
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Production values should use the deployed frontend and backend origins.
OAuth authorized origins and redirect URIs must exactly match the Better
Auth configuration. Keep localhost entries for development.

> Variable names can differ if the repository's current configuration
> has been renamed. Check the auth and API client configuration before
> adding new variables.

## Local development

### Prerequisites

-   Node.js compatible with the version pinned by the repository.
-   npm (or the package manager specified by the lockfile).
-   A running backend API.
-   Valid local authentication and database configuration.

### Run the frontend

``` bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Useful checks

``` bash
npx tsc --noEmit
npm run lint
npm run build
```

Run the scripts that are actually defined in `package.json`; the
commands above assume the usual Next.js project scripts.

## Backend integration

The frontend uses the backend API for authenticated email and assistant
operations.

Known assistant endpoint:

``` text
POST /api/v1/assistant/command
```

The frontend sends the user's command together with relevant UI context,
such as the active inbox filter and selected email. Authentication is
handled through the configured Better Auth / Google account flow and the
backend validates the request.

The frontend should use the deployed backend base URL, for example:

``` text
https://inbound-backend-9kmc.onrender.com
```

Do not configure the frontend to call the worker deployment URL. Workers
are background processes, not HTTP APIs.

## Planned: semantic and hybrid inbox search

> **Roadmap item --- not yet implemented.** The current assistant
> retrieval uses existing database/basic search paths. A dedicated
> hybrid SQL + vector retrieval system is planned.

The intended search experience will let users ask questions such as:

-   "Find emails about internship opportunities."
-   "What did the recruiter say about compensation?"
-   "Show the meeting invitation from last week."
-   "Find emails where someone asked me to submit a document."

Planned retrieval design:

``` mermaid
flowchart TD
    Q[User natural-language query] --> EMB[Generate query embedding]
    Q --> KW[Keyword / PostgreSQL search]
    EMB --> VEC[Vector similarity search]
    KW --> F[Metadata and access filters]
    VEC --> F
    F --> R[Hybrid ranking and deduplication]
    R --> E[Relevant email IDs and snippets]
    E --> LLM[Assistant synthesizes grounded answer]
    LLM --> UI[Frontend results with source emails]
```

Planned implementation considerations:

1.  Generate embeddings for email subject and body.
2.  Store vectors alongside email identifiers and tenant/user metadata.
3.  Apply user ownership and inbox metadata filters before returning
    results.
4.  Combine PostgreSQL keyword retrieval with vector similarity
    retrieval.
5.  Rank, deduplicate, and return source email references.
6.  Ground assistant answers in retrieved messages and link results back
    to the original emails.

PostgreSQL with `pgvector` is a candidate because the project already
uses PostgreSQL. The final vector-storage choice and ranking strategy
remain to be implemented and evaluated.

## Security notes

-   Never commit `.env.local`, OAuth secrets, API keys, database URLs,
    or access/refresh tokens.
-   Keep Google OAuth secrets server-side.
-   Do not expose backend secrets through `NEXT_PUBLIC_*` variables.
-   Treat assistant actions as untrusted until validated by the backend.
-   Require explicit confirmation for consequential email actions.
-   Enforce user-level access controls on all email data returned by the
    backend.

## Deployment

The frontend is deployed on Vercel.

Production frontend:

``` text
https://inbound-opal.vercel.app
```

Production API:

``` text
https://inbound-backend-9kmc.onrender.com
```

After changing environment variables in Vercel, redeploy the frontend so
the new configuration is applied.

## Roadmap

-   [ ] Complete Google OAuth app verification and production readiness.
-   [ ] Finish end-to-end testing of Gmail authorization and email
    workflows.
-   [ ] Improve natural-language date/time extraction for scheduling.
-   [ ] Implement hybrid keyword + vector inbox search.
-   [ ] Add grounded assistant answers with source-email references.
-   [ ] Expand workflow coverage while preserving human approval.

## Repository separation

This repository contains the **frontend only**. Backend routes, Gmail
ingestion, workers, LangGraph orchestration, and database models live in
the separate backend repository.
