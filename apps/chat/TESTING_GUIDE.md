# Testing Guide - McLuhan Chat App

Complete guide for testing the McLuhan chat application with emphasis on artifact integration, services, and components.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Testing Services](#testing-services)
- [Testing Components](#testing-components)
- [Testing Artifacts](#testing-artifacts)
- [Integration Testing](#integration-testing)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Quick Start

### Run Tests

```bash
# Run all tests
bun run test

# Watch mode (auto-rerun on changes)
bun run test:watch

# Run specific test file
bun run test -- src/services/ArtifactStorageService/__tests__/unit/ArtifactStorageService.test.ts

# Run tests matching pattern
bun run test -- --grep "ArtifactExtraction"

# With coverage
bun run test:coverage
```

### Setup

Tests are configured in `vitest.config.ts`:
- **Environment:** happy-dom (lightweight DOM)
- **Globals:** true (no need to import describe/it/expect)
- **Setup file:** `src/__tests__/setup.ts`
- **Coverage provider:** v8

## Test Structure

```
src/__tests__/
├── setup.ts                    # Vitest setup & cleanup
├── fixtures/
│   ├── test-data.ts           # Message & thread fixtures
│   └── artifacts.ts           # Artifact fixtures (code, Mermaid, JSON, SVG)
└── helpers/
    ├── test-wrapper.tsx       # React TestWrapper with atom registry
    ├── service-mocks.ts       # Mock implementations of services
    └── integration-helpers.ts # Effect runtime helpers

src/services/*/
├── service.ts
├── __tests__/
│   └── unit/
│       └── ServiceName.test.ts

src/components/*/
├── Component.tsx
└── __tests__/
    └── Component.test.tsx
```

## Testing Services

### Testing ArtifactStorageService

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { ArtifactStorageService } from "../ArtifactStorageService/index.js";
import { createTestCodeArtifact } from "../__tests__/fixtures/artifacts.js";

describe("ArtifactStorageService", () => {
  it("should save and retrieve artifacts", async () => {
    const messageId = "test-msg-1";
    const artifact = createTestCodeArtifact();

    const program = Effect.gen(function* () {
      const storage = yield* ArtifactStorageService;

      // Save
      yield* storage.saveArtifacts(messageId, [artifact]);

      // Retrieve
      const retrieved = yield* storage.getArtifacts(messageId);

      return retrieved;
    });

    // Run with default implementation
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(ArtifactStorageService.Default()))
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.type.category).toBe("code");
  });
});
```

### Testing ArtifactExtractionService

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { ArtifactExtractionService } from "../ArtifactExtractionService/index.js";

describe("ArtifactExtractionService", () => {
  it("should extract code artifacts from markdown", async () => {
    const content = `Here's some code:

\`\`\`typescript
function hello() {
  console.log("world");
}
\`\`\`

Hope that helps!`;

    const program = Effect.gen(function* () {
      const extraction = yield* ArtifactExtractionService;
      return yield* extraction.extractFromContent(content);
    });

    const artifacts = await Effect.runPromise(
      program.pipe(Effect.provide(ArtifactExtractionService.Default()))
    );

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.type.category).toBe("code");
  });
});
```

### Using Mock Services

```typescript
import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { ArtifactExtractionService } from "../ArtifactExtractionService/index.js";
import { createMockArtifactExtractionService } from "../__tests__/helpers/service-mocks.js";
import { createTestCodeArtifact } from "../__tests__/fixtures/artifacts.js";

describe("with mocked extraction", () => {
  it("should use mock implementation", async () => {
    const testArtifact = createTestCodeArtifact();

    // Create mock that returns a fixed artifact
    const mockLayer = createMockArtifactExtractionService(
      () => Effect.succeed([testArtifact])
    );

    const program = Effect.gen(function* () {
      const extraction = yield* ArtifactExtractionService;
      return yield* extraction.extractFromContent("anything");
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(mockLayer))
    );

    expect(result[0]?.id).toBe(testArtifact.id);
  });
});
```

## Testing Components

### Testing with Artifacts

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Message } from "@/components/Message.jsx";
import { createTestMessage } from "@/__tests__/fixtures/test-data.js";
import { createTestCodeArtifact } from "@/__tests__/fixtures/artifacts.js";
import { renderWithAtoms } from "@/__tests__/helpers/test-wrapper.jsx";

describe("Message Component with Artifacts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render artifacts inline", () => {
    const messageId = "msg-1";
    const artifact = createTestCodeArtifact();

    // Pre-populate localStorage with artifact
    localStorage.setItem(
      `chat-artifacts:${messageId}`,
      JSON.stringify([artifact])
    );

    const message = createTestMessage({
      id: messageId,
      role: "assistant",
      content: "Here's some code:",
      metadata: { hasArtifacts: true },
    });

    renderWithAtoms(<Message message={message} />);

    // Check that artifact renderer is present
    expect(screen.queryByText("Example Function")).toBeInTheDocument();
  });
});
```

## Testing Artifacts

### Using Artifact Fixtures

```typescript
import { createTestCodeArtifact } from "@/__tests__/fixtures/artifacts.js";
import { createTestMermaidArtifact } from "@/__tests__/fixtures/artifacts.js";
import { createTestJsonArtifact } from "@/__tests__/fixtures/artifacts.js";
import { createTestSvgArtifact } from "@/__tests__/fixtures/artifacts.js";
import { createTestArtifacts } from "@/__tests__/fixtures/artifacts.js";

// Create individual artifacts
const code = createTestCodeArtifact();
const diagram = createTestMermaidArtifact();
const json = createTestJsonArtifact();
const svg = createTestSvgArtifact();

// Create all types at once
const artifacts = createTestArtifacts();

// Override specific properties
const customCode = createTestCodeArtifact({
  id: "custom-id",
  content: "custom code here",
});
```

## Integration Testing

### Testing Extraction + Storage Flow

```typescript
import { describe, it, expect } from "vitest";
import { testArtifactFlow } from "@/__tests__/helpers/integration-helpers.js";

describe("Artifact Flow Integration", () => {
  it("should extract and store artifacts", async () => {
    const content = `
\`\`\`python
def fibonacci(n):
    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)
\`\`\`

\`\`\`json
{"fibonacci": [0, 1, 1, 2, 3, 5, 8]}
\`\`\`
    `;

    const result = await testArtifactFlow(content, "msg-123");

    // Verify extraction
    expect(result.extracted.length).toBeGreaterThan(0);

    // Verify storage
    expect(result.retrieved.length).toBe(result.extracted.length);

    // Verify stats
    expect(result.stats.artifactCount).toBe(result.extracted.length);
  });
});
```

### Testing with Custom Service Layers

```typescript
import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { testArtifactFlow } from "@/__tests__/helpers/integration-helpers.js";
import { createCodeExtractionMock } from "@/__tests__/helpers/service-mocks.js";
import { createMockArtifactStorageService } from "@/__tests__/helpers/service-mocks.js";

describe("Integration with Custom Mocks", () => {
  it("should extract only code blocks", async () => {
    const extractionLayer = createCodeExtractionMock();
    const storageLayer = createMockArtifactStorageService();

    const content = `
\`\`\`python
print("hello")
\`\`\`

Some text

\`\`\`javascript
console.log("world")
\`\`\`
    `;

    const result = await testArtifactFlow(
      content,
      "msg-1",
      extractionLayer,
      storageLayer
    );

    // Should extract 2 code blocks
    expect(result.extracted.length).toBe(2);
    expect(result.extracted.every((a) => a.type.category === "code")).toBe(
      true
    );
  });
});
```

## Best Practices

### 1. Use Fixtures for Consistency

```typescript
// ✅ GOOD - Consistent test data
const message = createTestMessage({ role: "assistant" });
const artifact = createTestCodeArtifact();

// ❌ BAD - Hardcoded data
const message = { id: "1", role: "assistant", content: "test", timestamp: 0 };
```

### 2. Clean Up After Tests

```typescript
describe("ArtifactStorage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear();
  });
});
```

### 3. Use Mocks for Isolation

```typescript
// ✅ GOOD - Test component in isolation
const mockLayer = createMockArtifactStorageService();
const result = await runEffect(program, mockLayer);

// ❌ BAD - Relying on real service
const result = await Effect.runPromise(
  program.pipe(Effect.provide(ArtifactStorageService.Default()))
);
```

### 4. Test Error Cases

```typescript
describe("ArtifactStorageService", () => {
  it("should handle invalid JSON gracefully", async () => {
    localStorage.setItem("chat-artifacts:test", "invalid-json");

    const program = Effect.gen(function* () {
      const storage = yield* ArtifactStorageService;
      return yield* storage.getArtifacts("test").pipe(Effect.either);
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(ArtifactStorageService.Default()))
    );

    expect(result._tag).toBe("Left");
  });
});
```

### 5. Use Descriptive Test Names

```typescript
// ✅ GOOD
it("should save multiple artifacts and retrieve them in order", () => {});
it("should return empty array for non-existent message", () => {});

// ❌ BAD
it("should work", () => {});
it("test storage", () => {});
```

## Common Patterns

### Pattern: Test Service with Dependencies

```typescript
describe("StreamingService with Artifacts", () => {
  it("should extract artifacts after streaming", async () => {
    const extractionLayer = createCodeExtractionMock();
    const storageLayer = createMockArtifactStorageService();

    const testLayer = Layer.mergeAll(extractionLayer, storageLayer);

    const program = Effect.gen(function* () {
      const streaming = yield* StreamingService;
      // Test extraction during streaming
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toBeDefined();
  });
});
```

### Pattern: Test React Component with Atoms

```typescript
describe("Message Component", () => {
  it("should render with atoms", () => {
    const message = createTestMessage();

    // Use renderWithAtoms instead of render
    renderWithAtoms(<Message message={message} />);

    expect(screen.getByText(message.content)).toBeInTheDocument();
  });
});
```

### Pattern: Test Multiple Artifact Types

```typescript
describe("ArtifactRenderer", () => {
  const artifactTypes = [
    { type: "code" as const, Component: CodeArtifact },
    { type: "mermaid" as const, Component: MermaidArtifact },
    { type: "json" as const, Component: JsonArtifact },
    { type: "svg" as const, Component: SvgArtifact },
  ];

  artifactTypes.forEach(({ type, Component }) => {
    it(`should render ${type} artifacts`, () => {
      const artifact = createTestArtifact(type);
      renderWithAtoms(<Component artifact={artifact} />);
      // Test rendering
    });
  });
});
```

## Coverage Goals

Target coverage for critical paths:
- **Services:** >80% (CRUD operations, error handling)
- **Components:** >70% (user interactions, rendering)
- **Artifacts:** >85% (extraction, storage, rendering)
- **Integration:** >60% (full flows)

Run coverage report:

```bash
bun run test:coverage
# Opens coverage report in coverage/index.html
```

## Troubleshooting

### LocalStorage Not Persisting

```typescript
// Reset before each test
beforeEach(() => {
  localStorage.clear();
});
```

### Atom Registry Missing

```typescript
// Use renderWithAtoms for components using @effect-atom
import { renderWithAtoms } from "@/__tests__/helpers/test-wrapper.jsx";

renderWithAtoms(<YourComponent />); // ✅ CORRECT
render(<YourComponent />); // ❌ WRONG
```

### Effect Runtime Errors

```typescript
// Always provide layers
const program = Effect.gen(function* () {
  const service = yield* ArtifactStorageService;
  // ...
});

// ✅ Provide default or mock layer
await Effect.runPromise(
  program.pipe(Effect.provide(ArtifactStorageService.Default()))
);

// ❌ No layer provided
await Effect.runPromise(program); // Error!
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Effect.ts Testing](https://effect.website/docs/guides/testing)
- [ARTIFACT_INTEGRATION.md](../ARTIFACT_INTEGRATION.md) - Artifact architecture

## Contributing Tests

When adding new features:

1. Create test fixtures in `src/__tests__/fixtures/`
2. Create service mocks in `src/__tests__/helpers/service-mocks.ts`
3. Add unit tests to `src/services/YourService/__tests__/`
4. Add component tests to `src/components/YourComponent/__tests__/`
5. Add integration tests to appropriate test files
6. Document patterns used in this guide

Ensure >70% coverage for new code before submitting PR.
