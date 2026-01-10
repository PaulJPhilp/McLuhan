# Test Infrastructure

Comprehensive testing utilities and fixtures for the McLuhan chat app.

## Directory Structure

```
src/__tests__/
├── README.md                       # This file
├── setup.ts                        # Vitest global setup
├── fixtures/                       # Test data factories
│   ├── test-data.ts               # Messages, threads, streams
│   └── artifacts.ts               # Code, Mermaid, JSON, SVG artifacts
├── helpers/                        # Testing utilities
│   ├── test-wrapper.tsx           # React wrapper with atoms
│   ├── service-mocks.ts           # Service mock implementations
│   └── integration-helpers.ts     # Effect runtime helpers
└── examples/                       # Example test files
    └── artifact-testing-example.test.ts
```

## Quick Reference

### Fixtures (Test Data Factories)

#### Messages & Threads

```typescript
import {
  createTestMessage,
  createTestThreadState,
  createTestMessages,
  createTestStream,
} from "@/__tests__/fixtures/test-data.js";

// Create single message
const message = createTestMessage({ role: "assistant" });

// Create thread state
const thread = createTestThreadState({ messages: [] });

// Create multiple messages
const messages = createTestMessages(5, "user");

// Create async stream for streaming tests
const stream = createTestStream(["Hello", " ", "World"]);
```

#### Artifacts

```typescript
import {
  createTestCodeArtifact,
  createTestMermaidArtifact,
  createTestJsonArtifact,
  createTestSvgArtifact,
  createTestArtifact,
  createTestArtifacts,
} from "@/__tests__/fixtures/artifacts.js";

// Create individual artifact types
const code = createTestCodeArtifact();
const diagram = createTestMermaidArtifact();
const json = createTestJsonArtifact();
const svg = createTestSvgArtifact();

// Create all types at once
const allArtifacts = createTestArtifacts();

// Create with custom properties
const custom = createTestCodeArtifact({
  type: { category: "code", language: "python" },
  content: "print('hello')",
});

// Create by type string
const byType = createTestArtifact("json", { id: "custom-id" });
```

### Service Mocks

```typescript
import {
  createMockArtifactExtractionService,
  createMockArtifactStorageService,
  createCodeExtractionMock,
  createTestServiceLayer,
} from "@/__tests__/helpers/service-mocks.js";

// Create default mock (returns empty)
const extractionMock = createMockArtifactExtractionService();

// Create mock with custom behavior
const customMock = createMockArtifactExtractionService(
  (content) => Effect.succeed([myTestArtifact])
);

// Create storage mock with initial data
const storageMock = createMockArtifactStorageService(
  new Map([["msg-1", [artifact1, artifact2]]])
);

// Create code extraction mock (parses markdown code blocks)
const codeMock = createCodeExtractionMock();

// Combine multiple mocks into a layer
const layer = createTestServiceLayer(extractionMock, storageMock);
```

### React Components

```typescript
import {
  TestWrapper,
  renderWithAtoms,
} from "@/__tests__/helpers/test-wrapper.jsx";
import { render } from "@testing-library/react";

// Option 1: Use renderWithAtoms for components using @effect-atom
renderWithAtoms(<MyComponent />);

// Option 2: Use TestWrapper manually
render(
  <TestWrapper>
    <MyComponent />
  </TestWrapper>
);

// Option 3: Plain render for non-atom components
render(<SimpleComponent />);
```

### Effect Runtime

```typescript
import {
  runEffect,
  runEffectSync,
  testArtifactExtraction,
  testArtifactStorage,
  testArtifactFlow,
  createTestStorageContext,
} from "@/__tests__/helpers/integration-helpers.js";

// Run effect with async runtime
const result = await runEffect(myEffect, myLayer);

// Run effect synchronously
const result = runEffectSync(myEffect, myLayer);

// Test artifact extraction
const artifacts = await testArtifactExtraction(
  content,
  extractionLayer,
  expectedCount
);

// Test artifact storage
const { saved, retrieved, stats } = await testArtifactStorage(
  messageId,
  artifacts,
  storageLayer
);

// Test complete flow
const { extracted, retrieved, stats } = await testArtifactFlow(
  content,
  messageId,
  extractionLayer,
  storageLayer
);

// Test storage in isolation
const storage = createTestStorageContext();
storage.save("msg-1", [artifact]);
const retrieved = storage.get("msg-1");
storage.delete("msg-1");
storage.clear();
```

## Common Test Patterns

### Testing a Service

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { ArtifactStorageService } from "@/services/ArtifactStorageService/index.js";
import { createTestCodeArtifact } from "@/__tests__/fixtures/artifacts.js";

describe("ArtifactStorageService", () => {
  it("should save and retrieve artifacts", async () => {
    const artifact = createTestCodeArtifact();

    const program = Effect.gen(function* () {
      const storage = yield* ArtifactStorageService;
      yield* storage.saveArtifacts("msg-1", [artifact]);
      return yield* storage.getArtifacts("msg-1");
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(ArtifactStorageService.Default()))
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(artifact.id);
  });
});
```

### Testing a React Component

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Message } from "@/components/Message.jsx";
import { createTestMessage } from "@/__tests__/fixtures/test-data.js";
import { renderWithAtoms } from "@/__tests__/helpers/test-wrapper.jsx";

describe("Message Component", () => {
  it("should render message content", () => {
    const message = createTestMessage({
      role: "assistant",
      content: "Hello, World!",
    });

    renderWithAtoms(<Message message={message} />);

    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });
});
```

### Integration Test

```typescript
import { describe, it, expect } from "vitest";
import { testArtifactFlow } from "@/__tests__/helpers/integration-helpers.js";
import { createCodeExtractionMock } from "@/__tests__/helpers/service-mocks.js";

describe("Artifact Flow", () => {
  it("should extract and store code artifacts", async () => {
    const content = "```python\nprint('hello')\n```";
    const extractionLayer = createCodeExtractionMock();

    const result = await testArtifactFlow(
      content,
      "msg-1",
      extractionLayer
    );

    expect(result.extracted).toHaveLength(1);
    expect(result.retrieved).toHaveLength(1);
  });
});
```

## Setup

### Global Setup (`setup.ts`)

Runs automatically before all tests:
- Imports `@testing-library/jest-dom` for DOM matchers
- Cleans up React components after each test
- Clears localStorage after each test (via setup)

### Configuration (`vitest.config.ts`)

```typescript
{
  environment: "happy-dom",  // Lightweight DOM
  globals: true,             // No need to import describe/it/expect
  setupFiles: ["./src/__tests__/setup.ts"],
  testTimeout: 10000,        // 10 second timeout
}
```

## Running Tests

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Specific file
bun run test -- src/services/ArtifactStorageService/__tests__/unit/ArtifactStorageService.test.ts

# Matching pattern
bun run test -- --grep "ArtifactExtraction"

# With coverage
bun run test:coverage

# UI dashboard
bun run test:ui
```

## Best Practices

### 1. Use Factories for Consistency

```typescript
// ✅ GOOD
const message = createTestMessage({ role: "assistant" });

// ❌ BAD
const message = {
  id: "1",
  role: "assistant",
  content: "test",
  timestamp: 0,
};
```

### 2. Clean Up Resources

```typescript
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
```

### 3. Mock External Dependencies

```typescript
// ✅ GOOD
const mockLayer = createMockArtifactStorageService();
const result = await runEffect(program, mockLayer);

// ❌ BAD
const result = await Effect.runPromise(
  program.pipe(Effect.provide(ArtifactStorageService.Default()))
);
```

### 4. Test One Thing Per Test

```typescript
// ✅ GOOD
it("should save artifacts", () => {});
it("should retrieve artifacts", () => {});

// ❌ BAD
it("should save and retrieve artifacts", () => {});
```

### 5. Use Descriptive Names

```typescript
// ✅ GOOD
it("should return empty array when artifacts don't exist", () => {});

// ❌ BAD
it("should work", () => {});
```

## Advanced Patterns

### Custom Mock Behavior

```typescript
const customMock = createMockArtifactExtractionService(
  (content, provider, model) =>
    Effect.gen(function* () {
      // Custom logic
      if (content.includes("```")) {
        return [createTestCodeArtifact()];
      }
      return [];
    })
);
```

### Combining Mocks with Real Services

```typescript
const layer = Layer.mergeAll(
  createCodeExtractionMock(), // Real extraction logic
  createMockArtifactStorageService(), // Mock storage
);
```

### Storage Context for Isolated Tests

```typescript
const storage = createTestStorageContext();

// Test storage operations in isolation
storage.save("msg-1", [artifact]);
expect(storage.get("msg-1")).toHaveLength(1);
expect(storage.size()).toBe(1);
```

## Troubleshooting

### localStorage Not Clearing

```typescript
beforeEach(() => {
  localStorage.clear(); // Explicit clear
});
```

### Atom Registry Missing

```typescript
import { renderWithAtoms } from "@/__tests__/helpers/test-wrapper.jsx";

renderWithAtoms(<Component />); // ✅ CORRECT
render(<Component />); // ❌ Will fail without registry
```

### Effect Runtime Errors

```typescript
// ✅ CORRECT - Provide layer
await Effect.runPromise(
  program.pipe(Effect.provide(layer))
);

// ❌ WRONG - No layer
await Effect.runPromise(program);
```

## Examples

See `artifact-testing-example.test.ts` for comprehensive examples covering:
- Fixture usage
- Service mocking
- Integration testing
- Error handling
- Type safety

## Contributing

When adding tests:

1. Use existing fixtures from `fixtures/`
2. Create mocks using `helpers/service-mocks.ts`
3. Follow patterns from `examples/artifact-testing-example.test.ts`
4. Aim for >70% coverage
5. Use descriptive test names
6. Clean up resources in beforeEach/afterEach

See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for complete testing documentation.
