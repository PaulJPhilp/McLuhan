# Effect Chat UI - Complete Setup Guide

## What Is This?

A production-ready chat UI built with **Effect.js** that reimplements [assistant-ui.com](https://www.assistant-ui.com/) using Effect-based services from the McLuhan and Hume monorepos.

Instead of generic TypeScript libraries, this uses:
- **effect-ai-sdk** → Type-safe AI client (wraps Vercel AI SDK v5)
- **effect-actor** → State management as pure state machines
- **effect-supermemory** → Effect-based memory/persistence layer
- **Hume SDK** → Empathic Voice Interface (EVI) and emotion detection

## Prerequisites

- Node.js 18+
- Bun 1.1.33+ (package manager)
- An API key for at least one AI provider:
  - OpenAI (GPT-4) - **Recommended for testing**
  - Anthropic (Claude 3.5 Sonnet)
  - Google Gemini
  - Others supported by `effect-ai-sdk`

## Installation

### 1. Setup from Root

From the **McLuhan monorepo root**:

```bash
# Install all dependencies (chat + packages)
bun install
```

This automatically:
- Links `effect-ai-sdk`, `effect-actor`, `effect-supermemory` to the chat app
- Installs React, Tailwind CSS, Vite
- Installs Hume SDK for voice integration

### 2. Configure Environment

Create `.env.local` in `apps/chat/`:

```env
# Pick ONE AI provider (OpenAI recommended for testing)

# OpenAI
VITE_OPENAI_API_KEY=sk-proj-...

# OR Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...

# OR Google
VITE_GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional: Hume voice
VITE_HUME_API_KEY=...
```

**Note:** Vite requires `VITE_` prefix for env vars exposed to frontend.

### 3. Start Development

```bash
cd apps/chat
bun run dev
```

Server starts at **http://localhost:5173** with hot reload.

## Architecture Overview

### High-Level Design

```
┌───────────────────────────────────────┐
│         React Components              │
│  ChatThread, Message, Composer        │
└──────────────────┬────────────────────┘
                   │ useChatContext()
┌──────────────────┼────────────────────┐
│  ChatProvider    │                    │
│  (React Context) │                    │
│  + Effect Layers │                    │
└──────────────────┼────────────────────┘
                   │ Effect.provide()
┌──────────────────┼────────────────────┐
│   Effect Services │                   │
│  - ThreadService │ (wraps ThreadActor)
│  - ChatRuntime   │ (wraps effect-ai-sdk)
│  - HumeService   │ (voice/emotions)
│  - Persistence   │ (localStorage/supermemory)
└──────────────────┼────────────────────┘
                   │
┌──────────────────┼────────────────────┐
│  McLuhan Packages │                   │
│  - effect-ai-sdk │                    │
│  - effect-actor  │                    │
│  - effect-supermemory                 │
│  - Hume SDK      │                    │
└──────────────────────────────────────┘
```

### Key Concepts

#### 1. **ThreadActor** (State Machine)

Models conversation as pure state transitions:

```typescript
// State
type ThreadState = {
  id: string
  messages: Message[]
  isLoading: boolean
  error?: string
  lastUpdated: number
}

// Events
type ThreadMessage =
  | { type: 'ADD_MESSAGE'; payload: { role: 'user' | 'assistant'; content: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RETRY_LAST_MESSAGE' }
  | { type: 'CLEAR_MESSAGES' }

// Transition
(state: ThreadState, message: ThreadMessage) => Effect<ThreadState>
```

**Why?** Pure functions are testable, composable, and free of side effects.

#### 2. **ThreadService** (Effect Context)

Wraps ThreadActor in Effect service:

```typescript
class ThreadService extends Context.Tag<ThreadService>() {
  getState: () => Effect<ThreadState>
  send: (msg: ThreadMessage) => Effect<void>
  getMessages: () => Effect<Message[]>
  isLoading: () => Effect<boolean>
}
```

**Why?** Encapsulates mutable state, provides clean interface.

#### 3. **ChatRuntime** (AI Integration)

Bridges React to `effect-ai-sdk`:

```typescript
class ChatRuntime {
  generateResponse: (messages: Message[]) => Effect<string>
  streamResponse: (messages: Message[]) => AsyncIterable<string>
}
```

Detects provider from env, handles streaming automatically.

#### 4. **ChatContext** (React Bridge)

Connects services to React components via context:

```typescript
interface ChatContextValue {
  // State
  state: ThreadState
  messages: Message[]
  isLoading: boolean
  error: string | null

  // Actions
  sendMessage: (content: string) => Promise<void>
  addMessage: (role, content) => Promise<void>
  clearMessages: () => Promise<void>
  retryLastMessage: () => Promise<void>
}

// Hook for components
const { messages, sendMessage, isLoading } = useChatContext()
```

### Data Flow: User Sends Message

1. User types in `Composer` → presses Enter
2. `Composer` calls → `sendMessage(text)` from context
3. `ChatProvider` (ChatContext):
   - Adds user message via `ThreadService.send()`
   - Sets `isLoading: true`
   - Calls `ChatRuntime.streamResponse(messages)`
4. `ChatRuntime`:
   - Creates request to AI provider
   - Streams response chunks
5. `ChatProvider` appends assistant message
6. Components re-render via context update

## Project Structure

```
apps/chat/
├── src/
│   ├── App.tsx                         # Bootstrap + initialization
│   ├── main.tsx                        # React entry
│   │
│   ├── actors/
│   │   └── ThreadActor.ts              # State machine + schemas
│   │
│   ├── services/
│   │   ├── ChatRuntime.ts              # AI integration (effect-ai-sdk wrapper)
│   │   ├── ThreadService.ts            # Service layer (wraps ThreadActor)
│   │   ├── HumeService.ts              # Voice/emotion integration
│   │   └── PersistenceService.ts       # Storage abstraction
│   │
│   ├── components/
│   │   ├── ChatThread.tsx              # Message list display
│   │   ├── Message.tsx                 # Individual message + markdown
│   │   └── Composer.tsx                # Input + send button
│   │
│   ├── context/
│   │   └── ChatContext.tsx             # Provider + hooks
│   │
│   └── styles/
│       └── globals.css                 # Tailwind + theme
│
├── package.json                        # Dependencies: effect, react, hume, etc.
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite config
├── tailwind.config.ts                  # Tailwind theme
├── index.html                          # HTML entry
└── .env.local                          # API keys (create locally)
```

## Usage Examples

### Basic Message Flow

```typescript
// In ChatProvider (src/context/ChatContext.tsx)
const sendMessage = useCallback(
  async (content: string) => {
    // 1. Add user message
    await addMessage('user', content)
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // 2. Stream from AI
      let response = ''
      for await (const chunk of chatRuntime.streamResponse(state.messages)) {
        response += chunk
      }

      // 3. Add assistant message
      await addMessage('assistant', response)
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  },
  [addMessage, chatRuntime, state.messages]
)
```

### Adding a Feature: Message Reactions

**1. Update ThreadActor:**
```typescript
// ThreadActor.ts
export class Message extends Schema.Class<Message>('Message')({
  id: Schema.String,
  role: Schema.Literal('user', 'assistant'),
  content: Schema.String,
  timestamp: Schema.Number,
  reactions: Schema.optional(Schema.Array(
    Schema.Record({ emoji: Schema.String, count: Schema.Number })
  )),
}) {}

export type ThreadMessage =
  | { type: 'ADD_MESSAGE'; ... }
  | { type: 'ADD_REACTION'; payload: { messageId: string; emoji: string } }
```

**2. Add reducer logic:**
```typescript
// ThreadActor.ts
case 'ADD_REACTION': {
  const newMessages = state.messages.map(m => {
    if (m.id === message.payload.messageId) {
      const reactions = m.reactions || []
      const existing = reactions.find(r => r.emoji === message.payload.emoji)
      if (existing) {
        existing.count++
      } else {
        reactions.push({ emoji: message.payload.emoji, count: 1 })
      }
      return { ...m, reactions }
    }
    return m
  })
  return { ...state, messages: newMessages, lastUpdated: Date.now() }
}
```

**3. Expose in ThreadService:**
```typescript
// ThreadService.ts
addReaction: (messageId: string, emoji: string) =>
  Effect.gen(function* () {
    yield* service.send({
      type: 'ADD_REACTION',
      payload: { messageId, emoji }
    })
  })
```

**4. Expose in ChatContext:**
```typescript
// ChatContext.tsx
interface ChatContextValue {
  addReaction: (messageId: string, emoji: string) => Promise<void>
}

const addReaction = useCallback(async (messageId: string, emoji: string) => {
  const program = Effect.gen(function* () {
    const threadService = yield* ThreadService
    yield* threadService.addReaction(messageId, emoji)
  })
  await Effect.runPromise(Effect.provide(program, ThreadServiceLive))
}, [])
```

**5. Use in component:**
```tsx
// Message.tsx
const { addReaction } = useChatContext()

<div className="flex gap-2">
  {['👍', '❤️', '😂'].map(emoji => (
    <button
      key={emoji}
      onClick={() => addReaction(message.id, emoji)}
    >
      {emoji}
    </button>
  ))}
</div>
```

### Switching AI Providers

**In `App.tsx`:**

```typescript
// OpenAI (default)
const model = getLanguageModel('gpt-4')

// OR Anthropic
const model = getLanguageModel('claude-3-5-sonnet')

// OR Google
const model = getLanguageModel('gemini-1.5-pro')

// Then pass to runtime
const runtimeLayer = createChatRuntimeLive({ model })
```

API keys are auto-detected from env vars.

### Integrating Hume Voice

**In `ChatContext.tsx`:**

```typescript
// Replace:
const layer = Layer.merge(ThreadServiceLive, HumeServiceMock)

// With:
import { createHumeServiceLive } from '../services/HumeService'

const humeConfig: HumeConfig = {
  apiKey: import.meta.env.VITE_HUME_API_KEY,
  enableVoice: true,
  enableEmotionDetection: true,
}

const layer = Layer.merge(
  ThreadServiceLive,
  createHumeServiceLive(humeConfig)
)

// Now use Hume in components:
const humeService = yield* HumeService
const sessionId = yield* humeService.startVoiceSession()
```

### Persistence: Switch to effect-supermemory

By default, chat uses localStorage (5MB limit). For production:

**In `ChatContext.tsx`:**

```typescript
import { PersistenceServiceSupermemory } from '../services/PersistenceService'

// Create layer with your supermemory config
const persistenceLayer = PersistenceServiceSupermemory({
  // Your supermemory backend config
})

const layer = Layer.merge(
  ThreadServiceLive,
  persistenceLayer
)
```

Then on message add, save:

```typescript
const saveThread = (threadId: string, messages: Message[]) =>
  Effect.gen(function* () {
    const persistence = yield* PersistenceService
    yield* persistence.saveThread(threadId, messages)
  })
```

## Commands

### Development
```bash
bun run dev          # Start dev server (http://localhost:5173)
bun run typecheck    # Check TypeScript
bun run lint         # Lint with Biome
bun run format:fix   # Auto-format
```

### Build
```bash
bun run build        # Production build → dist/
bun run preview      # Preview build locally
```

## Debugging

### Effect Operations

All operations have type-safe logging:

```typescript
// In ChatProvider
yield* Effect.logInfo(`State updated: ${JSON.stringify(state)}`)

// Check browser console for logs
```

### React DevTools

- Open React DevTools Profiler
- Check `ChatProvider` re-renders
- Inspect context value (messages, state, etc.)

### Network Tab

- Look for requests to `api.openai.com`, `api.anthropic.com`, etc.
- Check `Content-Type: text/event-stream` for streaming
- Verify `Authorization: Bearer $API_KEY`

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module 'effect-ai-sdk'" | Run `bun install` from root; check tsconfig paths |
| ChatRuntime fails to initialize | Check `.env.local` has valid API key; check console errors |
| Streaming not working | Check Network tab; verify API key permissions; ensure provider endpoint is accessible |
| Messages not persisting | Check localStorage in DevTools Application tab; verify PersistenceService is initialized |
| HumeService not working | Ensure `createHumeServiceLive` is used (not mock); check `VITE_HUME_API_KEY` |
| Build fails | Run `bun install` again; ensure all packages link properly |

## Deployment

### Vercel
```bash
# Push to GitHub, connect to Vercel
# Add environment variables in Vercel dashboard:
VITE_OPENAI_API_KEY=...
VITE_HUME_API_KEY=...
```

### Netlify
```bash
# Build command: cd apps/chat && bun run build
# Publish directory: apps/chat/dist
# Add environment variables in Netlify UI
```

### Docker
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install && cd apps/chat && bun run build
EXPOSE 3000
CMD ["bun", "serve", "apps/chat/dist/index.html"]
```

## Further Learning

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into design patterns
- **[effect-ai-sdk docs](../effect-ai-sdk/README.md)** - AI SDK reference
- **[effect-actor docs](../effect-actor/README.md)** - State machine primitives
- **[Effect.js handbook](https://effect.website/)** - Learn Effect
- **[assistant-ui](https://assistant-ui.com/)** - Original inspiration
- **[Hume AI](https://hume.ai/)** - Voice/emotion integration

## Contributing

To extend or modify:

1. **Add new message type** → Update `ThreadMessage` in ThreadActor
2. **Add state field** → Extend `ThreadState` schema
3. **Add component** → Create in `src/components/`
4. **Add service** → Create Effect Context tag in `src/services/`
5. **Test** → All Effect code is pure and testable

## License

MIT (same as McLuhan monorepo)
