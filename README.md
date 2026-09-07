# Agent Hooks 🚀

A modern monorepo platform for creating, testing, and orchestrating dynamic AI-powered API endpoints and pipeline transformations.

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Monorepo Structure](#-monorepo-structure)
- [Quick Start](#-quick-start)
- [Environment Setup & Configuration](#-environment-setup--configuration)
  - [API Environment Variables (`apps/api`)](#api-environment-variables-appsapi)
  - [Web Environment Variables (`apps/web`)](#web-environment-variables-appsweb)
- [Available Scripts](#-available-scripts)
- [Tech Stack](#-tech-stack)

---

## 🔍 Overview

**Agent Hooks** provides a full-stack environment to generate, manage, and execute dynamic backend hooks and AI-assisted pipelines.

Key capabilities include:
- **Dynamic API Endpoints**: Define custom endpoints with customizable request execution scripts (JavaScript, JSONata, JSON Logic).
- **AI-Powered Generation**: Integrate with Ollama to generate templates, pipeline scripts, and natural language responses.
- **Endpoint Collections**: Group and manage related API hooks into logical collections.
- **Zero-Config Core Services**: Intelligent fallbacks allow developers to run the core server and database stack out of the box with zero mandatory configuration. AI features can be activated by providing your Ollama credentials and model.

---

## 📁 Monorepo Structure

```text
agenthooks/
├── apps/
│   ├── api/             # Express.js REST API server (MongoDB, JWT Auth, Ollama AI)
│   └── web/             # Next.js frontend web application (React, Tailwind CSS)
├── packages/
│   ├── ui/              # Shared React component library
│   ├── eslint-config/   # Shared ESLint configuration
│   └── typescript-config/ # Shared tsconfig bases
├── .env.example         # Workspace environment template
├── pnpm-workspace.yaml  # Monorepo workspace configuration
└── turbo.json           # Turborepo task pipeline configuration
```

---

## 🚀 Quick Start

> [!NOTE]
> Prerequisites: Node.js `^18.0.0` or higher and `pnpm ^9.0.0`.

### 1. Clone & Install Dependencies

```sh
git clone <repository-url>
cd agenthooks
pnpm install
```

### 2. Run Development Mode

Start both the backend API and frontend web client simultaneously:

```sh
pnpm dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)

---

## ⚙️ Environment Setup & Configuration

Agent Hooks comes with safe development fallbacks for core services, while AI-assisted capabilities require configuring your AI provider credentials and model.

> [!TIP]
> To configure local development or production deployments, copy the provided `.env.example` templates to `.env.local`:

```sh
# Copy API configuration template
cp apps/api/.env.example apps/api/.env.local

# Copy Web configuration template
cp apps/web/.env.example apps/web/.env.local
```

### API Environment Variables (`apps/api`)

| Variable | Description | Default Fallback | Required |
| :--- | :--- | :--- | :---: |
| `PORT` | HTTP server port | `4000` | No |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/agenthooks` | No |
| `DB_NAME` | Database name | `agenthooks` | No |
| `ACCESS_TOKEN_SECRET` | Secret key for signing JWT access tokens | `dev-access-secret` | No |
| `REFRESH_TOKEN_SECRET` | Secret key for signing JWT refresh tokens | `dev-refresh-secret` | No |
| `CLIENT_ORIGIN` | Allowed client origin for CORS requests | `http://localhost:3000` | No |
| `OLLAMA_BASE_URL` | Ollama API base URL | `https://ollama.com/api` | No |
| `OLLAMA_API_KEY` | Ollama API authentication key for cloud models | *None* | **Yes** (for AI features) |
| `AI_MODEL` | AI model name used for code/script generation (e.g. `deepseek-v4-flash`) | *None* | **Yes** (for AI features) |

### Web Environment Variables (`apps/web`)

| Variable | Description | Default Fallback | Required |
| :--- | :--- | :--- | :---: |
| `NEXT_PUBLIC_API_URL` | Backend API base URL for client requests | `http://localhost:4000` | No |
| `NEXT_PUBLIC_APP_NAME` | Application display title | `Agent Hooks` | No |

---

## 🛠️ Available Scripts

Run scripts from the workspace root using `pnpm` and `turbo`:

### Monorepo Tasks

```sh
# Start development servers (all apps)
pnpm dev

# Build all applications and packages for production
pnpm build

# Run ESLint across all apps and packages
pnpm lint

# Format code with Prettier
pnpm format

# Run TypeScript type checks
pnpm check-types
```

### Targeting Specific Apps

You can run commands for a specific app using Turborepo filters:

```sh
# Run API dev server only
pnpm dev --filter=api

# Run Web dev server only
pnpm dev --filter=web

# Build only the Web project
pnpm build --filter=web
```

---
