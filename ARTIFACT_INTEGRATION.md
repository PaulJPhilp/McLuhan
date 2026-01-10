# Artifact Integration Guide

This document describes the complete artifact integration for McLuhan's React chatapp and effect-cli-tui examples. It provides automatic extraction, storage, and rendering of AI-generated artifacts like code, diagrams, and JSON data.

## Overview

**Artifacts** are structured content pieces (code, diagrams, JSON, SVG) automatically extracted from AI responses and displayed inline with proper formatting.

### Architecture

```
AI Response
    ↓
Extraction (effect-artifact)
    ↓
Storage (localStorage / Supermemory)
    ↓
Rendering (React components / Terminal)
```

## Features

### React Chatapp (`/apps/chat`)

- **Automatic Extraction**: Artifacts extracted automatically from AI responses
- **Inline Display**: Artifacts render inline with message content
- **Type-Specific Rendering**:
  - Code: Syntax highlighting, line numbers, copy button
  - Mermaid: Interactive visual diagrams
  - JSON: Collapsible tree view
  - SVG: Centered visual display
- **Persistence**: Artifacts stored in localStorage (5MB capacity)
- **Error Handling**: Quota exceeded detection and storage management

### CLI Examples (`/packages/effect-cli-tui/examples`)

- **Interactive Chat**: CLI-based chat with Claude using effect-ai-sdk
- **Terminal Rendering**: Display artifacts in terminal-friendly format
- **Artifact Actions**: Copy to clipboard, save to file
- **Mermaid Support**: Display Mermaid source with link to mermaid.live
- **Example**: `artifact-chat-example.ts`

## Service Architecture

### ArtifactExtractionService

Wraps `effect-artifact`'s `extractArtifactsFromString()` function.

**Location**: `src/services/ArtifactExtractionService.ts`

**API**:
```typescript
interface ArtifactExtractionServiceSchema {
  readonly extractFromContent: (
    content: string,
    modelProvider?: string,
    modelId?: string
  ) => Effect.Effect<readonly Artifact[]>
}
```

**Usage**:
```typescript
const program = Effect.gen(function* () {
  const extraction = yield* ArtifactExtractionService;
  const artifacts = yield* extraction.extractFromContent(
    aiResponse,
    "anthropic",
    "claude-3-sonnet"
  );
});
```

### ArtifactStorageService

Manages localStorage persistence with quota handling.

**Location**: `src/services/ArtifactStorageService.ts`

**API**:
```typescript
interface ArtifactStorageServiceSchema {
  readonly saveArtifacts: (
    messageId: string,
    artifacts: readonly Artifact[]
  ) => Effect.Effect<void, ArtifactStorageError>

  readonly getArtifacts: (
    messageId: string
  ) => Effect.Effect<readonly Artifact[], ArtifactStorageError>

  readonly deleteArtifacts: (
    messageId: string
  ) => Effect.Effect<void, ArtifactStorageError>

  readonly getStorageStats: () => Effect.Effect<StorageStats, ArtifactStorageError>

  readonly clearOldArtifacts: (
    olderThanMs: number
  ) => Effect.Effect<number, ArtifactStorageError>
}
```

**Error Handling**:
- `QUOTA_EXCEEDED`: Storage quota exhausted
- `NOT_AVAILABLE`: localStorage unavailable
- `INVALID_DATA`: Corrupted stored data
- `UNKNOWN`: Other errors

**Usage**:
```typescript
const program = Effect.gen(function* () {
  const storage = yield* ArtifactStorageService;

  // Save
  yield* storage.saveArtifacts(messageId, artifacts);

  // Retrieve
  const loaded = yield* storage.getArtifacts(messageId);

  // Get stats
  const stats = yield* storage.getStorageStats();
  console.log(`Using ${stats.usagePercent}% of quota`);

  // Clean up old artifacts
  const deleted = yield* storage.clearOldArtifacts(1000 * 60 * 60 * 24); // 24 hours
});
```

## React Components

### ArtifactRenderer

Routes artifacts to appropriate component based on type.

**Location**: `src/components/artifacts/ArtifactRenderer.tsx`

**Supported Types**:
- `code`: CodeArtifact
- `diagram` (mermaid): MermaidArtifact
- `diagram` (svg): SvgArtifact
- `data` (json): JsonArtifact

### Component Implementations

#### CodeArtifact
- Syntax highlighting with prism-react-renderer
- Line numbers
- Copy-to-clipboard button
- Language badge

#### MermaidArtifact
- Interactive diagram rendering
- Error handling with source fallback
- Automatic initialization

#### JsonArtifact
- Collapsible tree view with react-json-tree
- Copy-to-clipboard button
- Graceful JSON parsing error handling

#### SvgArtifact
- Safe SVG rendering
- Centered display with proper dimensions

## Integration Flow

### Chatapp Message Flow

1. **User sends message** → ThreadService stores it
2. **StreamingService streams response** → accumulates content
3. **After streaming completes**:
   - Extract artifacts via ArtifactExtractionService
   - Store via ArtifactStorageService
   - Update message metadata: `{ hasArtifacts: true }`
4. **Message component renders**:
   - Display markdown content
   - Load artifacts from storage
   - Render each artifact via ArtifactRenderer

### CLI Flow

1. **User input** → Send to Claude via effect-ai-sdk
2. **AI response** → extractArtifactsFromString()
3. **Display response** → Render in terminal
4. **Handle artifacts**:
   - Code: Syntax highlight with cli-highlight
   - Mermaid: Display source + link to mermaid.live
   - JSON: Pretty-print with syntax highlight
   - SVG: Offer to save to file

## Usage Examples

### Chatapp

The artifact integration works automatically. Just chat normally:

```
User: Write me a Python function to sort an array
Assistant: Here's a Python function...
[Code artifact renders with syntax highlighting]
```

### CLI Example

Run the artifact chat example:

```bash
export OPENAI_API_KEY=sk_your_key_here
bun run examples/artifact-chat-example.ts
```

Example prompts:
- "Write a TypeScript function to calculate factorial"
- "Create a Mermaid flowchart for user login"
- "Give me a JSON config example for a web server"
- "Write a Bash backup script"

## Storage Configuration

### Chatapp (localStorage)

**Storage Key Format**: `chat-artifacts:{messageId}`

**Capacity**: ~5MB (typical browser limit)

**Content**: JSON array of Artifact objects

**Metadata**: Stored in `chat-artifacts:metadata` for quota management

**Migration Path**: To move to IndexedDB:
1. Update ArtifactStorageService implementation
2. Use `@effect/platform` FileSystem for abstraction
3. Tests will catch any breaking changes

### CLI (effect-supermemory - Optional)

For persistent memory across CLI sessions:

```typescript
const program = Effect.gen(function* () {
  const memories = yield* MemoriesService;
  const artifact = artifacts[0];

  yield* memories.add({
    content: `Artifact: ${artifact.metadata.title}\n\n${artifact.content}`,
    metadata: {
      artifactId: artifact.id,
      category: artifact.type.category,
      tags: artifact.metadata.tags,
    },
  });
});
```

## Error Handling

### User-Facing Errors

The services handle errors gracefully:

- **Quota exceeded**: Suggest clearing old artifacts or browser storage
- **Corrupted data**: Suggest clearing artifacts for that message
- **Storage unavailable**: Display warning, allow chat to continue

### Developer-Side Error Handling

```typescript
const program = Effect.gen(function* () {
  const storage = yield* ArtifactStorageService;

  const result = yield* storage.saveArtifacts(messageId, artifacts).pipe(
    Effect.catchTag("ArtifactStorageError", (error) => {
      if (error.code === "QUOTA_EXCEEDED") {
        // Trigger automatic cleanup
        return storage.clearOldArtifacts(7 * 24 * 60 * 60 * 1000); // 7 days
      }
      // Log and continue
      console.warn(`Artifact storage error: ${error.message}`);
      return Effect.void;
    })
  );
});
```

## Testing

### Unit Tests

**ArtifactStorageService**: `src/services/__tests__/ArtifactStorageService.test.ts`
- Save/retrieve/delete operations
- Storage stats and quota management
- Error handling (quota exceeded, invalid data)
- Multiple artifact handling

**ArtifactExtractionService**: `src/services/__tests__/ArtifactExtractionService.test.ts`
- Code extraction (multiple languages)
- JSON/Mermaid/SVG extraction
- Multiple artifacts from single response
- Model metadata preservation

### Integration Tests

**Artifact Integration**: `src/services/__tests__/ArtifactIntegration.test.ts`
- Full extraction → storage → retrieval flow
- Multiple messages with separate artifacts
- Storage cleanup and deletion
- Multi-language artifact handling
- Quota behavior

### Running Tests

```bash
cd /Users/paul/Projects/Trinity/McLuhan

# Run all tests
bun run test

# Run specific test
bun run test -- ArtifactStorageService.test.ts

# Watch mode
bun run test:watch
```

## Verification Checklist

### Chatapp

- [ ] Chat with "Write me a Python function"
- [ ] Verify code artifact extracted with syntax highlighting
- [ ] Send "Create a Mermaid flowchart"
- [ ] Verify diagram renders visually
- [ ] Refresh page and verify artifacts load from localStorage
- [ ] Send multiple prompts and verify artifacts don't cross-contaminate
- [ ] Check browser DevTools: localStorage should have `chat-artifacts:*` keys

### CLI

```bash
# Set API key
export OPENAI_API_KEY=sk_your_key_here

# Run example
bun run examples/artifact-chat-example.ts

# Test prompts:
# - "Write me a TypeScript function"
# - "Create a Mermaid diagram"
# - "Give me a JSON config"
```

## Performance Considerations

**Storage Size**:
- Average artifact: 1-50KB
- 5MB localStorage supports ~100+ typical artifacts
- Use `clearOldArtifacts()` to manage quota

**Extraction Speed**:
- Lightweight regex-based detection
- Non-blocking in StreamingService
- < 100ms for typical responses

**Rendering**:
- Prism syntax highlighting cached
- Mermaid diagram rendering on-demand
- JSON tree lazy-loads large objects

## Future Enhancements

1. **IndexedDB Migration**: For larger capacity (50MB+)
2. **Artifact Search**: Index and search past artifacts
3. **Export Functionality**: Download multiple artifacts as ZIP
4. **Annotation**: Add notes to artifacts
5. **Artifact Versioning**: Track changes to artifacts
6. **Plugin System**: Custom artifact renderers

## Troubleshooting

### Artifacts Not Appearing

1. Check browser console for errors
2. Verify `hasArtifacts: true` in message metadata
3. Check localStorage quota: Open DevTools → Application → Storage

### "Storage Quota Exceeded"

```typescript
const storage = yield* ArtifactStorageService;
const stats = yield* storage.getStorageStats();
console.log(`Using ${stats.usagePercent}% of quota`);

// Clean up old artifacts
const deleted = yield* storage.clearOldArtifacts(24 * 60 * 60 * 1000);
console.log(`Deleted ${deleted} old artifacts`);
```

### CLI Artifact Example Issues

- Ensure `OPENAI_API_KEY` is set
- Check that TTY support is available (won't work in non-interactive shells)
- Try with simple prompts first ("Write a hello world function")

## API Documentation

See full type definitions in:
- `src/services/ArtifactExtractionService.ts`
- `src/services/ArtifactStorageService.ts`
- `src/components/artifacts/ArtifactRenderer.tsx`

## Related Links

- **effect-artifact**: `/Users/paul/Projects/Trinity/Hume/packages/effect-artifact`
- **Chatapp**: `/Users/paul/Projects/Trinity/McLuhan/apps/chat`
- **CLI Examples**: `/Users/paul/Projects/Trinity/McLuhan/packages/effect-cli-tui/examples`
