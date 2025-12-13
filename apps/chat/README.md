# Effect Chat UI

A modern, Effect-native chat interface inspired by [assistant-ui](https://www.assistant-ui.com/), built with React and integrated with the McLuhan/Trinity ecosystem.

## Features

- **Effect-native Architecture**: Built on Effect.js functional programming library for type-safe, composable state management
- **AI Integration**: Powers LLM interactions via `effect-ai-sdk` (supports OpenAI, Anthropic, and other providers)
- **State Management**: Uses `effect-actor` for reliable, testable conversation state management
- **Persistence**: Optional persistence layer via `effect-supermemory` or local storage
- **Hume AI Integration**: Ready for Hume's Empathic Voice Interface (EVI) and emotion detection
- **Component-Based UI**: Modular React components (Thread, Message, Composer) following `assistant-ui` patterns
- **Markdown Support**: Rich text rendering with `react-markdown`
- **Responsive Design**: Tailwind CSS styling with a modern, clean interface

## Architecture

```
apps/chat/
├── src/
│   ├── actors/
│   │   └── ThreadActor.ts          # Effect-based state machine for conversations
│   ├── services/
│   │   ├── ThreadService.ts        # Thread management service
│   │   ├── ChatRuntime.ts          # AI SDK runtime adapter
│   │   ├── PersistenceService.ts   # Storage layer (localStorage/supermemory)
│   │   └── HumeService.ts          # Hume AI integration
│   ├── components/
│   │   ├── ChatThread.tsx          # Message display container
│   │   ├── Message.tsx             # Individual message component
│   │   └── Composer.tsx            # User input area
│   ├── context/
│   │   └── ChatContext.tsx         # React context for service consumption
│   ├── styles/
│   │   └── globals.css             # Tailwind-based styling
│   ├── App.tsx                     # Main app component
│   └── main.tsx                    # React entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── postcss.config.cjs
```

## Core Concepts

### ThreadActor
The `ThreadActor` is an Effect-based state machine that manages conversation state:

```typescript
type ThreadMessage = 
  | { type: 'ADD_MESSAGE'; payload: { role: 'user' | 'assistant'; content: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RETRY_LAST_MESSAGE' }
  | { type: 'CLEAR_MESSAGES' }
```

### ThreadService
Wraps the ThreadActor in an Effect Context, providing a convenient interface:

```typescript
class ThreadService {
  getState: () => Effect<ThreadState>
  send: (message: ThreadMessage) => Effect<void>
  getMessages: () => Effect<Message[]>
  isLoading: () => Effect<boolean>
}
```

### ChatRuntime
Bridges React components to `effect-ai-sdk` for AI operations:

```typescript
class ChatRuntime {
  generateResponse: (messages: Message[]) => Effect<string>
  streamResponse: (messages: Message[]) => AsyncIterable<string>
}
```

### ChatContext
React Context that provides services to components:

```typescript
interface ChatContextValue {
  state: ThreadState
  messages: Message[]
  isLoading: boolean
  error: string | null
  addMessage: (role: string, content: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => Promise<void>
  retryLastMessage: () => Promise<void>
}
```

## UI Components

### ChatThread
Displays the conversation history with:
- Automatic scrolling to latest message
- Loading indicators
- Error messages
- Message timestamps
- User/assistant message styling

### Message
Individual message component featuring:
- Markdown rendering for assistant messages
- Role-based styling
- Timestamps
- Syntax highlighting for code blocks

### Composer
User input area with:
- Multi-line text input with auto-expand
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Loading state feedback
- Disabled state handling

## Getting Started

### Prerequisites

- Node.js 18.18+
- Bun 1.1.33+ (recommended for monorepo)
- API keys for LLM providers (OpenAI, Anthropic, etc.)

### Installation

```bash
cd apps/chat
bun install
```

### Configuration

Set up environment variables in `.env.local`:

```env
# AI SDK Configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Hume AI
HUME_API_KEY=...
```

### Development

```bash
bun run dev
```

Opens the chat UI at `http://localhost:5173`

### Build

```bash
bun run build
```

Generates optimized production build in `dist/`

## Usage

### Basic Setup

```tsx
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
```

### Using ChatContext in Components

```tsx
import { useChatContext } from '@/context/ChatContext'

function MyComponent() {
  const { messages, isLoading, sendMessage } = useChatContext()

  const handleSend = async () => {
    await sendMessage('Hello!')
  }

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={handleSend} disabled={isLoading}>
        Send
      </button>
    </div>
  )
}
```

### Accessing Services Directly

```tsx
import { Effect, Layer } from 'effect'
import { ThreadService, ThreadServiceLive } from '@/services/ThreadService'

const program = Effect.gen(function* () {
  const service = yield* ThreadService
  const state = yield* service.getState()
  console.log(state)
})

const layer = ThreadServiceLive
await Effect.runPromise(Effect.provide(program, layer))
```

## Integration with Trinity Ecosystem

### effect-ai-sdk
Used for LLM interactions:
```typescript
import { generateText, streamText } from 'effect-ai-sdk'

// Generate complete response
const response = yield* generateText(model, { messages })

// Stream response chunks
for await (const chunk of streamResponse(model, { messages })) {
  // Handle streaming chunk
}
```

### effect-actor
Provides state machine primitives:
```typescript
import { Actor } from 'effect-actor'

const ref = yield* Actor.make({
  initialState: threadState,
  receive: (state, message) => handleMessage(state, message)
})
```

### effect-supermemory
Optional integration for persistent storage:
```typescript
import { SupermemoryHttpClient } from 'effect-supermemory'

// Store conversation
yield* client.ingestDocuments({
  documents: [serializedMessages]
})

// Retrieve conversation
const docs = yield* client.searchDocuments({
  query: threadId
})
```

### Hume AI
Ready for voice and emotion detection:
```typescript
import { HumeService } from '@/services/HumeService'

const service = yield* HumeService
const sessionId = yield* service.startVoiceSession()
const emotions = yield* service.getDetectedEmotions(sessionId)
```

## Key Differences from assistant-ui

| Feature | assistant-ui | Effect Chat UI |
|---------|--------------|--------|
| **State Management** | React hooks + custom logic | Effect actor + functional programming |
| **Type Safety** | TypeScript | TypeScript + Effect.Schema |
| **AI Backend** | Vercel AI SDK directly | effect-ai-sdk wrapper |
| **Persistence** | Custom implementation | effect-supermemory integration |
| **Architecture** | Component-focused | Service-based with dependency injection |
| **Error Handling** | try/catch | Effect error tracking |
| **Testing** | Jest/Testing Library | Effect + Vitest |

## Development Roadmap

### Phase 1 ✅ (Complete)
- [x] Basic chat UI with Thread, Message, Composer
- [x] ThreadActor state management
- [x] effect-ai-sdk integration
- [x] Context-based component wiring
- [x] localStorage persistence

### Phase 2 (Planned)
- [ ] Multi-thread support with ThreadList sidebar
- [ ] Message editing and deletion
- [ ] File upload support
- [ ] Tool/function calling integration
- [ ] Advanced streaming with delta updates

### Phase 3 (Planned)
- [ ] Hume EVI full integration
- [ ] Emotion display and analysis
- [ ] Voice input/output
- [ ] Real-time collaboration

### Phase 4 (Planned)
- [ ] effect-supermemory persistent backend
- [ ] Long-term memory and context retrieval
- [ ] Search across conversation history
- [ ] Analytics and conversation insights

## Testing

Run tests:
```bash
bun run test
```

Watch mode:
```bash
bun run test:watch
```

## Linting & Formatting

```bash
bun run lint
bun run format:fix
```

## Troubleshooting

### "ChatRuntime not configured"
Ensure `effect-ai-sdk` is properly configured with a valid LLM provider and API key.

### Messages not persisting
By default, localStorage is used. Clear browser storage or switch to `effect-supermemory` for server-side persistence.

### Slow streaming responses
Check network connection and LLM provider rate limits. Streaming relies on proper backend configuration.

### Hume integration not working
Ensure `hume` package is installed and `HUME_API_KEY` is set. Currently using mock implementation for development.

## Contributing

When adding new features:

1. **State Changes**: Update `ThreadActor` for new state types
2. **Services**: Extend `ChatRuntime`, `ThreadService`, or create new Effect services
3. **Components**: Use `useChatContext()` for state access
4. **Persistence**: Implement in `PersistenceService`
5. **Tests**: Add tests using Effect's testing utilities

## License

MIT - See LICENSE file in McLuhan repository

## Resources

- [assistant-ui Documentation](https://www.assistant-ui.com/)
- [Effect.js Documentation](https://effect.website/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Hume AI](https://hume.ai/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
