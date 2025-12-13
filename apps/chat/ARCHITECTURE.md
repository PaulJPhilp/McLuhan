# Effect Chat UI - Architecture & Design Decisions

## Overview

The Effect Chat UI reimplements the `assistant-ui` architecture using Effect-based services from the McLuhan and Hume monorepos. This document explains the design decisions, patterns, and integration points.

## Design Principles

### 1. **Functional Programming with Effect**
- All state management uses Effect.js for composable, type-safe effects
- Services are expressed as Effect Context tags
- No mutable global state; all state changes flow through effect layers

### 2. **Separation of Concerns**
- **Actors**: Pure state machines (ThreadActor)
- **Services**: Business logic and integrations (ThreadService, ChatRuntime, HumeService)
- **Components**: UI rendering only (ChatThread, Message, Composer)
- **Context**: React bridge between services and components (ChatContext)

### 3. **Dependency Injection**
- Effect layers provide services to consumers
- Components access services via React context
- Easy to swap implementations (mock vs. real services)

### 4. **Type Safety**
- Effect.Schema for runtime validation
- Full TypeScript strict mode
- Exhaustive pattern matching for state updates

## Core Architecture

### ThreadActor: State Machine

The `ThreadActor` models the conversation as a finite state machine:

```
Initial State:
{
  id: string
  messages: Message[]
  isLoading: false
  error: undefined
  lastUpdated: number
}

Transitions:
  ADD_MESSAGE → append message + update timestamp
  SET_LOADING → toggle isLoading
  SET_ERROR → set/clear error
  RETRY_LAST_MESSAGE → remove messages after last user message
  CLEAR_MESSAGES → reset to empty state
```

**Why Effect actor pattern?**
- Pure functions: `(state, message) => Effect<state>`
- Testable without mocking
- Integrated error handling
- Composable with other effects

### ThreadService: Service Layer

Wraps `ThreadActor` in an Effect Context:

```typescript
class ThreadService {
  getState: () => Effect<ThreadState>
  send: (message: ThreadMessage) => Effect<void>
  getMessages: () => Effect<Message[]>
  isLoading: () => Effect<boolean>
}
```

**Why separate from Actor?**
- Encapsulates internal state mutation
- Provides clean interface for components
- Can be replaced with alternative implementations
- Enables testing through mock layers

### ChatRuntime: AI Integration

Bridges React state management to `effect-ai-sdk`:

```typescript
streamResponse(messages) → AsyncIterable<string>
  ↓
  Creates ReadableStream from effect-ai-sdk
  ↓
  Handles provider detection (OpenAI, Anthropic)
  ↓
  Streams text chunks to component
```

**Design rationale:**
- Decouples AI logic from UI state
- Supports both streaming and non-streaming
- Easy to add new providers
- Effect-based error propagation

### ChatContext: React Integration

Custom React context that bridges Effect services to components:

```typescript
ChatProvider
  ↓
  Initializes ThreadService + HumeService layers
  ↓
  ChatContext.Provider wraps app
  ↓
  Components use useChatContext() hook
```

**Why custom context?**
- React components can't directly use Effect Context
- ChatContext adapts Effect.Effect to React promises/state
- Manages initialization lifecycle
- Handles runtime configuration

### PersistenceService: Storage Layer

Abstraction over storage backends:

```typescript
Local Implementation:
  Window.localStorage → serialized messages

Super Memory Implementation (future):
  effect-supermemory → distributed storage
  SearchDocuments → semantic search
  Metadata → conversation tagging
```

**Pluggable architecture:**
- Same interface for all backends
- Easy to implement new storage providers
- Can layer multiple implementations (L1: memory, L2: localStorage, L3: server)

### HumeService: Voice & Emotion

Ready for Hume AI integration:

```typescript
startVoiceSession() → sessionId
  ↓
  Initializes Hume EVI client (when available)
  ↓
getDetectedEmotions(sessionId) → [{ name, score }]
  ↓
  Real-time emotion data from voice
```

**Current status:**
- Mock implementation for development
- Placeholders for real Hume SDK integration
- Can be swapped at runtime via effect layers

## Data Flow

### User sends message:
```
1. Component calls sendMessage(text)
   ↓
2. ChatContext adds user message to state
   ↓
3. ChatContext calls ChatRuntime.streamResponse()
   ↓
4. ChatRuntime creates effect-ai-sdk stream
   ↓
5. Provider processes message through LLM
   ↓
6. Chunks stream back to component
   ↓
7. Component adds assistant message on complete
   ↓
8. PersistenceService saves thread (optional)
```

### Retry message:
```
1. Component calls retryLastMessage()
   ↓
2. ThreadActor removes messages after last user message
   ↓
3. Component re-displays thread from new state
   ↓
4. User can resend or edit message
```

## Integration Points

### With effect-ai-sdk

```typescript
// ChatRuntime.ts
const handle = streamText(config.model, {
  messages: messagesForAI,
  system: config.systemPrompt,
})

// Adapts UnifiedStreamEvent → text chunks
for await (const event of handle.readable) {
  if (event.type === 'text-delta') {
    yield event.delta
  }
}
```

### With effect-actor

```typescript
// ThreadActor.ts
export const receive = (state: ThreadState, message: ThreadMessage): Effect<ThreadState> =>
  Effect.gen(function* () {
    switch (message.type) {
      case 'ADD_MESSAGE':
        return { ...state, messages: [...state.messages, newMessage] }
      // ...
    }
  })
```

### With effect-supermemory (future)

```typescript
// PersistenceService.ts (supermemory variant)
const saveThread = (threadId, messages) =>
  Effect.gen(function* () {
    const client = yield* SupermemoryHttpClient
    yield* client.ingestDocuments({
      documents: [{
        title: threadId,
        content: JSON.stringify(messages),
        metadata: { type: 'chat_thread' }
      }]
    })
  })
```

### With Hume AI

```typescript
// HumeService.ts (live variant)
const startVoiceSession = () =>
  Effect.gen(function* () {
    const humeClient = yield* HumeClient
    const session = yield* humeClient.startEVISession()
    return session.id
  })
```

## Why This Architecture?

### vs. assistant-ui
- **More testable**: Pure effects don't require jsdom
- **More composable**: Effect layers combine elegantly
- **Better error tracking**: Effect propagates errors explicitly
- **Stronger types**: Schema validation at runtime

### vs. Redux/Zustand
- **Less boilerplate**: No action creators or middleware
- **Better type inference**: Discriminated unions in Effect
- **Built-in async**: No saga/thunk libraries needed
- **Dependency injection**: Natural service composition

### vs. MobX/Recoil
- **Functional**: Easier to reason about
- **Observable-free**: No dependency tracking overhead
- **Explicit**: All effects visible in code
- **Ecosystem**: Integrates with Effect suite

## Testing Strategy

### Unit: Actor Functions
```typescript
test('ADD_MESSAGE appends to messages', () => {
  const state = initialState
  const message = { type: 'ADD_MESSAGE', ... }
  const result = receive(state, message)
  expect(result.messages).toHaveLength(1)
})
```

### Integration: Services
```typescript
test('ThreadService persists state', async () => {
  const program = Effect.gen(function* () {
    const service = yield* ThreadService
    yield* service.send({ type: 'ADD_MESSAGE', ... })
    const state = yield* service.getState()
    expect(state.messages).toHaveLength(1)
  })
  
  await Effect.runPromise(Effect.provide(program, ThreadServiceLive))
})
```

### E2E: Components
```typescript
test('sending message updates UI', async () => {
  render(<ChatProvider><App /></ChatProvider>)
  const input = screen.getByPlaceholderText('Type your message...')
  await userEvent.type(input, 'Hello')
  await userEvent.click(screen.getByRole('button'))
  expect(await screen.findByText('Hello')).toBeInTheDocument()
})
```

## Future Enhancements

### Multi-threading
```
ThreadList component
  ↓
  useMultiThreadContext() hook
  ↓
  ThreadManager service
  ↓
  Switches active thread ID
```

### Advanced streaming
```
Message streaming pipeline:
  text-delta → markdown → syntax-highlight → render
  
Concurrent streams:
  Tool calls parallel to text generation
```

### Knowledge graph integration
```
Messages + Hume emotions + effect-mdx + effect-regex
  ↓
  Build knowledge graph of conversation
  ↓
  Use for semantic search and context
```

### Multi-modal support
```
File upload → effect-json/effect-mdx parsing
  ↓
Image/document → Hume emotion + vision model
  ↓
Mixed media thread
```

## Performance Considerations

1. **Message virtualization**: Large conversation lists should use windowing
2. **Debounce persistence**: Save every N messages, not every message
3. **Lazy load threads**: Load message history on demand
4. **Stream backpressure**: Handle slow consumers
5. **React.memo components**: Prevent unnecessary re-renders

## Security Considerations

1. **API key management**: Use effect-env for secure secrets
2. **Input sanitization**: Sanitize markdown before rendering
3. **CORS handling**: Proxy AI requests through backend
4. **Rate limiting**: Implement in composer before send
5. **Audit logging**: Log via effect-actor for compliance

## Conclusion

This architecture demonstrates how Effect.js enables building production-grade chat UIs with:
- Type safety and correctness
- Testability and composability
- Clear separation of concerns
- Easy integration with ecosystem packages
- Future-proof for advanced features

The chat UI serves as a reference implementation for how to structure Effect-based React applications.
