# Chat App Quick Start

## Installation

```bash
cd apps/chat
bun install
```

## Configuration

Create `.env.local` in the chat root:

```env
# OpenAI (recommended for testing)
OPENAI_API_KEY=sk-...

# Or Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Hume
HUME_API_KEY=...
```

## Running

**Development:**
```bash
bun run dev
```

Opens at `http://localhost:5173`

**Production build:**
```bash
bun run build
bun run preview
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Entry point, initializes ChatProvider |
| `src/context/ChatContext.tsx` | React context + Effect service wiring |
| `src/actors/ThreadActor.ts` | Conversation state machine |
| `src/services/ChatRuntime.ts` | AI SDK integration |
| `src/components/` | UI components (Thread, Message, Composer) |

## Typical Development Flow

1. **Add new message type** → Update `ThreadMessage` in `ThreadActor.ts`
2. **Add state field** → Extend `ThreadState` schema
3. **Add reducer logic** → Implement in `receive()` function
4. **Expose to components** → Add method to `ThreadService`
5. **Wire in ChatContext** → Add to `ChatContextValue` interface
6. **Update component** → Call from `useChatContext()` hook

## Example: Adding a feature

### Add message reactions

1. **Actor:**
```typescript
// ThreadActor.ts
export class Message {
  reactions?: { emoji: string; count: number }[]
}

export type ThreadMessage =
  | { type: 'ADD_REACTION'; payload: { messageId: string; emoji: string } }
```

2. **Reducer:**
```typescript
case 'ADD_REACTION': {
  const msg = state.messages.find(m => m.id === message.payload.messageId)
  // Update reactions...
  return { ...state, messages: [...] }
}
```

3. **Service:**
```typescript
// ThreadService.ts
addReaction: (messageId: string, emoji: string) => 
  service.send({ type: 'ADD_REACTION', payload: { messageId, emoji } })
```

4. **Context:**
```typescript
// ChatContext.tsx
interface ChatContextValue {
  addReaction: (messageId: string, emoji: string) => Promise<void>
}
```

5. **Component:**
```typescript
// Message.tsx
const { addReaction } = useChatContext()
<button onClick={() => addReaction(message.id, '👍')}>👍</button>
```

## Common Issues

**"Cannot find module 'effect-ai-sdk'"**
- Ensure you're using workspace imports
- Check `tsconfig.json` path aliases

**"ChatRuntime not configured"**
- Verify API key in `.env.local`
- Check that model provider is available

**Streaming not working**
- Check network tab for blocked requests
- Verify provider endpoint is reachable
- Ensure API key has proper permissions

## Structure Diagram

```
ChatProvider (initializes services)
  │
  ├─ ThreadService (manages state)
  │   └─ ThreadActor (state machine)
  │
  ├─ ChatRuntime (AI integration)
  │   └─ effect-ai-sdk
  │
  ├─ HumeService (voice/emotions)
  │   └─ Hume SDK (future)
  │
  └─ PersistenceService (storage)
      └─ localStorage or effect-supermemory

Components (consume context)
  ├─ ChatThread (displays messages)
  ├─ Message (renders individual message)
  └─ Composer (user input)
```
