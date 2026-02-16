# Chat UI

A multi-model AI chat interface built with Next.js and TypeScript. Supports **OpenAI**, **Anthropic Claude**, **Google Gemini**, and **Ollama** (local models) from a single unified interface.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Multi-provider support** -- Switch between OpenAI, Claude, Gemini, and local Ollama models from a dropdown
- **Auto-detection** -- Only shows providers you've configured API keys for
- **Responsive design** -- Works on desktop and mobile
- **Markdown rendering** -- AI responses render with full GitHub-flavored markdown (code blocks, tables, lists, links)
- **Security hardened** -- Input validation, rate limiting, system prompt injection prevention, security headers
- **Dark theme** -- Clean, modern dark UI

## Supported Models

| Provider | Models | Env Variable |
|---|---|---|
| **OpenAI** | GPT-5.2, GPT-5.2 Instant, GPT-5 Mini, GPT-5 Nano, GPT-4o, GPT-4o Mini, o3-mini | `OPENAI_API_KEY` |
| **Anthropic** | Claude Opus 4.6, Claude Sonnet 4.5, Claude Haiku 4.5 | `ANTHROPIC_API_KEY` |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, Gemini 2.0 Flash | `GOOGLE_AI_API_KEY` |
| **Ollama** | Any local model (llama3.3, mistral, phi4, etc.) | `OLLAMA_BASE_URL` |

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- At least one AI provider API key (or a local Ollama instance)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/hillis/gpt-4-chat-ui.git
cd gpt-4-chat-ui
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your API keys (use any combination):

```env
# OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...

# Anthropic Claude (https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini (https://aistudio.google.com/apikey)
GOOGLE_AI_API_KEY=AIza...

# Ollama local models (https://ollama.com/)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODELS=llama3.3,mistral,phi4
```

You only need to set the keys for the providers you want to use. The UI will auto-detect which are available.

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── lib/
│   └── providers.ts        # Provider abstraction (OpenAI, Claude, Gemini, Ollama)
├── pages/
│   ├── api/
│   │   ├── chat.ts          # POST /api/chat — sends messages to selected provider
│   │   └── providers.ts     # GET /api/providers — returns available models
│   ├── index.tsx            # Main chat UI
│   ├── _app.tsx             # Next.js app wrapper
│   └── _document.tsx        # Next.js document wrapper
├── styles/
│   ├── Home.module.css      # Component styles
│   └── globals.css          # Global styles
├── public/                  # Static assets (icons, images)
├── next.config.js           # Next.js config with security headers
├── package.json
└── tsconfig.json
```

## Architecture

```
Browser ──POST /api/chat──▶ API Route ──▶ Provider Router
  │         { provider, model, messages }       │
  │                                             ├── OpenAI SDK
  │                                             ├── Anthropic SDK
  │                                             ├── Google GenAI SDK
  │                                             └── Ollama (fetch)
  │◀── { result: { role, content } } ──────────┘
```

The frontend calls `GET /api/providers` on load to discover available models, then sends chat messages to `POST /api/chat` with the selected `provider` and `model`. The backend validates the request, routes to the correct SDK, and returns a unified response format.

## Adding a New Provider

To add a new AI provider, create a factory function in `lib/providers.ts`:

```typescript
function createMyProvider(): ProviderConfig | null {
  const apiKey = process.env.MY_PROVIDER_API_KEY;
  if (!apiKey) return null;

  return {
    provider: "myprovider",
    models: [
      { id: "my-model-id", name: "My Model", provider: "myprovider" },
    ],
    async chat(model, messages) {
      // Call your provider's API and return the response text
      return "response text";
    },
  };
}
```

Then add it to the `providerFactories` array and add `"myprovider"` to the `ALLOWED_PROVIDER_NAMES` set in `pages/api/chat.ts`. No other files need changes.

## Security

This project includes several security measures:

- **Input validation** -- All messages validated for type, length (max 4000 chars), and count (max 50)
- **Role sanitization** -- Only `"user"` and `"assistant"` roles accepted from clients; prevents system prompt injection
- **Rate limiting** -- 20 requests per minute per IP (in-memory)
- **Error handling** -- API errors logged server-side only; clients receive generic messages (no API key leakage)
- **Security headers** -- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- **No `X-Powered-By`** -- Header disabled
- **Provider/model allowlist** -- Server validates provider name and model ID against registered allowlists

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

Deploy to any platform that supports Next.js:

- **[Vercel](https://vercel.com/)** -- Zero-config deployment (recommended)
- **[Railway](https://railway.app/)**
- **[Render](https://render.com/)**
- **Docker** -- Use `npm run build && npm start`

Set your API keys as environment variables in your hosting platform's dashboard.

## Built With

- [Next.js 14](https://nextjs.org/) -- React framework
- [TypeScript 5](https://www.typescriptlang.org/) -- Type safety
- [OpenAI SDK](https://github.com/openai/openai-node) -- GPT-5.2 / GPT-4o
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) -- Claude Opus 4.6 / Sonnet 4.5
- [Google GenAI SDK](https://github.com/googleapis/js-genai) -- Gemini 2.5
- [React Markdown](https://github.com/remarkjs/react-markdown) -- Markdown rendering
- [Material UI](https://mui.com/) -- Loading spinner component

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

Originally inspired by [LangChain-Chat-NextJS](https://github.com/zahidkhawaja/langchain-chat-nextjs).

## License

This project is licensed under the MIT License.
