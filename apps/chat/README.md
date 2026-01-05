# Effect Chat UI

A modern, Effect-native chat interface inspired by [assistant-ui](https://www.assistant-ui.com/), built with React and integrated with the McLuhan/Trinity ecosystem.

## Features

- **Effect-native Architecture**: Built on Effect.js for type-safe, composable state management
- **AI Integration**: Powered by `effect-ai-sdk` with support for multiple providers (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen)
- **Streaming Responses**: Real-time text generation with incremental UI updates
- **State Management**: Pure state machine using `effect-actor` for reliable conversation state
- **Markdown Support**: Rich text rendering with syntax highlighting via `react-markdown`
- **Responsive Design**: Modern Tailwind CSS styling with clean, accessible interface
- **Comprehensive Testing**: 109 passing tests with 72%+ code coverage
- **No Mocks**: All tests use real implementations following workspace policy

## Quick Start

### Prerequisites

- **Bun** 1.1.33+ (package manager and runtime)
- **Node.js** 18.18+ (for compatibility)

### Installation

```bash
# From the monorepo root
cd apps/chat
bun install
```

### Configuration

Create a `.env.local` file in `apps/chat/`:

```bash
# Required: At least one API key
VITE_OPENAI_API_KEY=your-openai-api-key
# OR
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional: Provider selection (defaults to OpenAI if both keys present)
VITE_AI_PROVIDER=openai  # or 'anthropic'

# Optional: Model selection
VITE_AI_MODEL=gpt-4o  # or 'claude-3-5-sonnet-20241022', etc.

# Optional: System prompt
VITE_SYSTEM_PROMPT=You are a helpful assistant.
```

### Development

```bash
# Start development server
bun run dev

# The app will open at http://localhost:5173
```

### Build

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## Architecture

### Core Components

```
┌─────────────────────────────────────┐
│  React Components (UI Layer)        │
│  - ChatThread, Message, Composer     │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ChatContext (React Bridge)         │
│  - useChatContext() hook            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Effect Services (Business Logic)   │
│  - ThreadService                    │
│  - ChatRuntime                      │
│  - HumeService                      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ThreadActor (State Machine)       │
│  - Pure state transitions           │
└─────────────────────────────────────┘
```

### Key Files

- **`src/actors/ThreadActor.ts`** - Pure state machine for conversation state
- **`src/services/ThreadService.ts`** - Effect service wrapping ThreadActor
- **`src/services/ChatRuntime.ts`** - AI integration via `effect-ai-sdk`
- **`src/context/ChatContext.tsx`** - React context providing services to components
- **`src/components/ChatThread.tsx`** - Message display container
- **`src/components/Message.tsx`** - Individual message component with markdown
- **`src/components/Composer.tsx`** - User input area with auto-expand

### State Management

The app uses a pure state machine pattern:

```typescript
// ThreadActor receives messages and returns new state
const newState = yield* receive(currentState, {
  type: 'ADD_MESSAGE',
  payload: { role: 'user', content: 'Hello' }
})
```

**State Transitions:**
- `ADD_MESSAGE` - Add a message to the conversation
- `CLEAR_MESSAGES` - Clear all messages
- `SET_LOADING` - Update loading state
- `SET_ERROR` - Set or clear error state
- `RETRY_LAST_MESSAGE` - Remove messages after last user message

## Usage

### Basic Chat Flow

1. User types a message in the Composer
2. Press `Enter` to send (or `Shift+Enter` for newline)
3. Message is added to ThreadService via ChatContext
4. ChatRuntime streams the AI response
5. UI updates incrementally as chunks arrive
6. Final message is synchronized back to ThreadService

### Programmatic Usage

```typescript
import { ChatProvider, useChatContext } from './context/ChatContext'

function MyComponent() {
  const { messages, sendMessage, isLoading, error } = useChatContext()
  
  const handleSend = async () => {
    await sendMessage('Hello, AI!')
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

// Wrap your app
<ChatProvider>
  <MyComponent />
</ChatProvider>
```

## Testing

### Run Tests

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Test UI
bun run test:ui

# Coverage report
bun run test:coverage
```

### Test Coverage

- **Overall**: 72%+ statements, 59%+ branches
- **Components**: 95%+ coverage
- **Actors**: 94%+ coverage
- **Context**: 73%+ coverage
- **Services**: 54%+ (ChatRuntime requires API keys for full coverage)

### Test Structure

```
src/
├── __tests__/
│   ├── setup.ts              # Test configuration
│   ├── fixtures/
│   │   └── test-data.ts      # Test data factories
│   └── helpers/              # Test utilities
├── actors/__tests__/
│   └── ThreadActor.test.ts   # Pure function tests
├── services/__tests__/
│   ├── ThreadService.test.ts
│   ├── ChatRuntime.test.ts
│   └── message-conversion.test.ts
├── context/__tests__/
│   └── ChatContext.test.tsx  # React integration tests
└── components/__tests__/
    ├── ChatThread.test.tsx
    ├── Message.test.tsx
    └── Composer.test.tsx
```

**Testing Principles:**
- ✅ No mocks - all tests use real implementations
- ✅ Effect.runPromise for Effect operations
- ✅ React Testing Library for components
- ✅ Real service layers for integration tests

## Development

### Code Quality

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format:fix
```

### Adding Features

1. **New State Transition**: Add to `ThreadActor.ts` message types
2. **New Service**: Create Effect.Service in `services/`
3. **New Component**: Add React component in `components/`
4. **Update Context**: Extend `ChatContext.tsx` if needed

### Project Structure

```
apps/chat/
├── src/
│   ├── actors/           # State machine (pure functions)
│   ├── services/         # Effect services
│   ├── context/          # React context bridge
│   ├── components/       # React UI components
│   ├── styles/          # Global styles
│   └── __tests__/        # Test utilities
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_OPENAI_API_KEY` | Yes* | - | OpenAI API key |
| `VITE_ANTHROPIC_API_KEY` | Yes* | - | Anthropic API key |
| `VITE_AI_PROVIDER` | No | `openai` | Provider to use (`openai` or `anthropic`) |
| `VITE_AI_MODEL` | No | Provider default | Model name (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`) |
| `VITE_SYSTEM_PROMPT` | No | - | System prompt for AI conversations |

\* At least one API key is required

## Dependencies

### Core

- **effect** - Functional effect system
- **effect-ai-sdk** - AI provider abstraction (workspace package)
- **effect-actor** - State machine patterns (workspace package)
- **effect-supermemory** - Persistence layer (workspace package)
- **react** + **react-dom** - UI framework
- **react-markdown** - Markdown rendering

### AI SDK (Peer Dependencies)

- **ai** - Vercel AI SDK v5
- **@ai-sdk/openai** - OpenAI provider
- **@ai-sdk/anthropic** - Anthropic provider

### Development

- **vitest** - Test framework
- **@testing-library/react** - React testing utilities
- **@biomejs/biome** - Linting and formatting
- **typescript** - Type checking
- **vite** - Build tool
- **tailwindcss** - Styling

## Integration with McLuhan/Trinity

This chat app is part of the **McLuhan** project within the **Trinity** monorepo:

- **McLuhan** - Agent infrastructure layer (AI orchestration, memory, TUI)
- **Hume** - Data foundation layer (format parsing, validation)

The chat app uses:
- `effect-ai-sdk` - AI operations wrapper
- `effect-actor` - State machine orchestration
- `effect-supermemory` - Memory/persistence layer

See the root `CLAUDE.md` for detailed architecture documentation.

## Browser Support

- Modern browsers with ES2022 support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

Part of the Trinity/McLuhan monorepo. See root LICENSE file.

## Contributing

1. Follow the workspace coding standards (see root `CLAUDE.md`)
2. Write tests for new features (no mocks)
3. Ensure type checking passes: `bun run typecheck`
4. Run full test suite: `bun run test`
5. Check coverage: `bun run test:coverage`

## Troubleshooting

### "No API key found" Error

Ensure at least one API key is set in `.env.local`:
```bash
VITE_OPENAI_API_KEY=sk-...
```

### Tests Failing

- Ensure dependencies are installed: `bun install`
- Check that test environment variables are set
- Some tests require API keys and are skipped by default

### Build Errors

- Run `bun run typecheck` to identify type errors
- Ensure all workspace dependencies are built: `bun run build` (from root)

### Provider Selection

The app selects providers in this order:
1. `VITE_AI_PROVIDER` if set and key exists
2. OpenAI if `VITE_OPENAI_API_KEY` exists
3. Anthropic if `VITE_ANTHROPIC_API_KEY` exists
4. Error if no keys found

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture guide
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [SETUP.md](./SETUP.md) - Setup and configuration
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure details

## Credits

Inspired by [assistant-ui](https://www.assistant-ui.com/) and built with:
- [Effect.js](https://effect.website) - Functional effect system
- [Vercel AI SDK](https://ai.vercel.com) - AI provider integration
- [React](https://react.dev) - UI framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
