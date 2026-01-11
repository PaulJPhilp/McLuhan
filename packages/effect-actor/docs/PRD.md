# effect-actor – Product Requirements Document

## Overview

**effect-actor** is a composable, Effect-native state machine orchestration framework. It enables developers to define stateful entity lifecycles as TypeScript objects, execute them with type-safe transitions, persist state via pluggable providers, and audit all changes.

---

## Core Capabilities (v1.0)

### 1. Define Actor Specifications (TypeScript Objects)

```typescript
import { Schema } from "effect";
import { ActorSpec, createActorSpec } from "effect-actor";

// Define entity schema
const ContentSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.Literal("Idea", "Planned", "Draft", "Review", "Published", "Archived"),
  publishTargetDate: Schema.optionalWith(Schema.Date, { exact: true }),
  wordCount: Schema.optionalWith(Schema.Number, { exact: true }),
  readingTime: Schema.optionalWith(Schema.Number, { exact: true }),
});

type Content = Schema.Schema.Type<typeof ContentSchema>;

// Define actor spec
const contentActorSpec = createActorSpec({
  id: "content-production",
  schema: ContentSchema,
  initial: "Idea",
  states: {
    Idea: {
      on: {
        PLAN: {
          target: "Planned",
          guard: "hasPublishTargetDate",
          action: "recordPlannedDate",
        },
        REJECT: "Rejected",
      },
    },
    Planned: {
      on: {
        START_DRAFT: "Draft",
      },
    },
    Draft: {
      on: {
        SUBMIT_REVIEW: {
          target: "Review",
          guard: "hasMinimumWordCount",
        },
        REVERT: "Planned",
      },
    },
    Review: {
      on: {
        APPROVE_PUBLISH: {
          target: "Published",
          action: "setPublishDate",
        },
        REQUEST_CHANGES: "Draft",
      },
    },
    Published: {
      on: {
        ARCHIVE: "Archived",
        UPDATE: "Draft",
      },
    },
    Archived: {},
    Rejected: {},
  },
  guards: {
    hasPublishTargetDate: (ctx) => ctx.publishTargetDate !== undefined,
    hasMinimumWordCount: (ctx) => (ctx.wordCount ?? 0) >= 1000,
  },
  actions: {
    recordPlannedDate: (ctx) => ({ ...ctx, publishTargetDate: new Date() }),
    setPublishDate: (ctx) => ({ ...ctx, publishDate: new Date() }),
  },
});
```

**Requirements:**
- Specs are TypeScript objects (not JSON, not YAML)
- Schema defines entity shape (via Effect.Schema)
- States define allowed transitions
- Guards are predicates over context
- Actions are pure functions that transform context
- All types are fully inferred

---

### 2. Execute Commands and Transitions

```typescript
import { Effect } from "effect";
import { ActorService } from "effect-actor";

// Execute a command (Effect style)
const effect = Effect.gen(function* () {
  const actor = yield* ActorService;
  
  // Command execution
  const result = yield* actor.execute({
    actorType: "content-production",
    actorId: "idea-1",
    event: "PLAN",
    data: { publishTargetDate: new Date("2025-12-01") },
  });
  
  return result;
});

// Or using Class API (non-Effect)
const actor = new ContentProductionActor(service);
const result = await actor.execute("idea-1", {
  event: "PLAN",
  data: { publishTargetDate: new Date("2025-12-01") },
});
```

**Requirements:**
- Commands specify: actor type, actor ID, event, optional data
- Commands are validated against spec
- Guards are evaluated; transition only if guards pass
- Actions are executed, producing new context
- New state and context are persisted
- Result includes: new state, new context, audit entry
- Errors are tagged and typed

---

### 3. Audit Trail and Event Sourcing

```typescript
// Query audit history
const history = await actor.getHistory("idea-1");
// Returns: [
//   { timestamp: "2025-10-20T15:00:00Z", event: "PLAN", from: "Idea", to: "Planned", actor: "paul", data: {...} },
//   { timestamp: "2025-10-20T15:05:00Z", event: "START_DRAFT", from: "Planned", to: "Draft", actor: "paul", data: {...} },
//   ...
// ]

// Query current state
const state = await actor.query("idea-1");
// Returns: { id: "idea-1", status: "Draft", title: "...", ... }

// Replay events
const finalState = await actor.replay("idea-1", upToTimestamp);
// Returns state as of specific point in time
```

**Requirements:**
- Every transition is recorded with: timestamp, event, from state, to state, actor, data, result
- Audit trail is immutable and queryable
- Replay allows reconstructing state at any point in time
- History can be filtered by time range, event type, actor
- Supports event sourcing patterns (if needed for rebuild)

---

### 4. Pluggable Storage Providers

```typescript
import { StorageProvider } from "effect-actor";

// Storage provider interface
interface StorageProvider {
  save(
    actorType: string,
    actorId: string,
    state: ActorState,
    audit: AuditEntry
  ): Effect<void, StorageError>;

  load(
    actorType: string,
    actorId: string
  ): Effect<ActorState, StorageError>;

  query(
    actorType: string,
    filter: QueryFilter
  ): Effect<ActorState[], StorageError>;

  getHistory(
    actorType: string,
    actorId: string
  ): Effect<AuditEntry[], StorageError>;
}

// Use with different backends
const notionProvider = new NotionStorageProvider(config);
const fsJsonProvider = new FsJsonStorageProvider(config);
const postgresProvider = new PostgresStorageProvider(config);

// Swap providers
const effect = actorService.execute(command).pipe(
  Effect.provideLayer(
    ActorService.layer.pipe(
      Layer.provide(notionProvider.layer)
    )
  )
);
```

**Requirements:**
- Storage provider interface is well-defined
- Multiple backends supported (Notion, fs-json, Postgres, etc.)
- Each backend handles persistence, queries, and audit trail
- Providers are composable via Effect.Layer
- Errors are mapped to typed error types
- Idempotency is handled per provider

---

### 5. Compute and Policy Providers

```typescript
// Compute provider (time, UUID, external services)
interface ComputeProvider {
  now(): Effect<Date>;
  uuid(): Effect<string>;
  estimateReadingTime(text: string): Effect<number>;
  // ... other computations
}

// Policy provider (retry, rate limits, permissions)
interface PolicyProvider {
  canExecute(
    actor: string,
    actorType: string,
    event: string
  ): Effect<boolean, PolicyError>;

  getRetryPolicy(event: string): RetryPolicy;
  getRateLimitPolicy(event: string): RateLimitPolicy;
}

// Use in actions/guards
const actions = {
  recordPlannedDate: (ctx, compute, policy) =>
    Effect.gen(function* () {
      const canExecute = yield* policy.canExecute("paul", "content-production", "PLAN");
      if (!canExecute) yield* Effect.fail(new PermissionError());

      const now = yield* compute.now();
      return { ...ctx, publishTargetDate: now };
    }),
};
```

**Requirements:**
- Compute provider interface for external operations
- Policy provider for authorization, retry, rate limiting
- Both are injected via Effect.Layer
- Guards and actions have access to providers
- Policies are enforced before transitions

---

### 6. Error Handling and Recovery

```typescript
// Tagged error types
export class GuardFailedError extends Data.TaggedError<"GuardFailedError"> {
  readonly guard: string;
  readonly reason: string;
}

export class TransitionNotAllowedError extends Data.TaggedError<"TransitionNotAllowedError"> {
  readonly from: string;
  readonly event: string;
  readonly available: string[];
}

export class StorageError extends Data.TaggedError<"StorageError"> {
  readonly backend: string;
  readonly operation: "save" | "load" | "query";
}

// Error recovery
const effect = actor.execute("idea-1", { event: "PLAN", ... }).pipe(
  Effect.catchTag("GuardFailedError", (err) =>
    Effect.gen(function* () {
      yield* Effect.logWarn(
        `Guard failed: ${err.guard}. Reason: ${err.reason}`
      );
      return yield* Effect.fail(err);
    })
  ),
  Effect.catchTag("TransitionNotAllowedError", (err) =>
    Effect.gen(function* () {
      yield* Effect.logError(
        `Cannot transition from ${err.from} on ${err.event}. ` +
        `Available transitions: ${err.available.join(", ")}`
      );
      return yield* Effect.fail(err);
    })
  ),
  Effect.retry(Schedule.exponential("100 millis")),
  Effect.tapError((err) => Effect.logError(`Final error: ${err}`)),
);
```

**Requirements:**
- All errors are tagged (GuardFailedError, TransitionNotAllowedError, StorageError, etc.)
- Errors include helpful context (what was expected, what went wrong)
- Errors are composable with Effect.catchTag, orElse, etc.
- Recovery patterns are documented with examples
- Retry logic can be applied per event or globally

---

### 7. Query and Introspection

```typescript
// Query current state
const state = await actor.query("idea-1");

// List all actors of a type
const allContent = await actor.list("content-production", {
  filter: { status: "Draft" },
  limit: 10,
  offset: 0,
});

// Get spec for an actor type
const spec = await actor.getSpec("content-production");
// Returns: { states: {...}, guards: {...}, actions: {...}, schema: {...} }

// Check if transition is allowed
const canTransition = await actor.canTransition("idea-1", "PLAN");
// Returns: { allowed: true, reason?: string }
```

**Requirements:**
- Query current state and history
- List actors with filters (status, date range, etc.)
- Introspect actor specs
- Check if transitions are allowed (before attempting)
- All queries are async and Observable

---

### 8. Dual API: Effect.Service + Class Wrapper

```typescript
// Effect.Service (power users, composable)
export class ContentProductionActorService extends Effect.Service<ContentProductionActorService>()(
  "app/ContentProductionActor",
  {
    effect: Effect.gen(function* () {
      const storage = yield* StorageProvider;
      const compute = yield* ComputeProvider;
      
      return {
        execute: (command) => Effect.gen(function* () {
          // All logic here
        }),
        query: (id) => Effect.gen(function* () {
          // All logic here
        }),
        getHistory: (id) => Effect.gen(function* () {
          // All logic here
        }),
      } as const;
    }),
    dependencies: [StorageProvider.layer, ComputeProvider.layer],
  }
) {}

// Class wrapper (non-Effect users, Promise-based)
export class ContentProductionActor {
  constructor(private service: ContentProductionActorService) {}
  
  async execute(
    id: string,
    command: Command
  ): Promise<ActorState> {
    return Effect.runPromise(this.service.execute({ ...command, actorId: id }));
  }
  
  async query(id: string): Promise<ActorState> {
    return Effect.runPromise(this.service.query(id));
  }
  
  async getHistory(id: string): Promise<AuditEntry[]> {
    return Effect.runPromise(this.service.getHistory(id));
  }
}

// Usage: Effect
yield* ContentProductionActorService.execute(command);

// Usage: Non-Effect
await new ContentProductionActor(service).execute("id", command);
```

**Requirements:**
- Effect.Service contains all logic
- Class wrapper delegates to service
- No duplication of business logic
- Both APIs work seamlessly
- Agents can generate both from single spec

---

### 9. Observability

```typescript
// Structured logging (via Effect.log)
Effect.logInfo(`Executing command: ${event} on ${actorId}`)
Effect.logDebug(`Guard evaluation: ${guard} = ${result}`)
Effect.logWarn(`Transition attempted from invalid state`)
Effect.logError(`Storage provider failed: ${error}`)

// Metrics
Effect.withSpan("actor.execute", {
  attributes: {
    actorType,
    actorId,
    event,
    fromState,
    toState,
    success: true,
  },
})

// Tracing
const span = yield* Effect.currentSpan;
yield* Effect.logInfo("...").pipe(span.event("important_step"))
```

**Requirements:**
- All operations emit structured logs
- Metrics for command execution, state transitions, errors
- Tracing spans for observability
- Correlation IDs for distributed tracing
- Integration with OpenTelemetry (future)

---

## API Surface (v1.0)

### ActorService (Effect.Service)

```typescript
export class ActorService extends Effect.Service<ActorService>()(
  "app/ActorService",
  {
    effect: Effect.gen(function* () {
      const storage = yield* StorageProvider;
      
      return {
        execute: (command) => Effect.gen(function* () {
          // Implementation
        }),
        query: (actorType, actorId) => Effect.gen(function* () {
          // Implementation
        }),
        list: (actorType, filter) => Effect.gen(function* () {
          // Implementation
        }),
        getHistory: (actorType, actorId) => Effect.gen(function* () {
          // Implementation
        }),
        canTransition: (actorType, actorId, event) => Effect.gen(function* () {
          // Implementation
        }),
        getSpec: (actorType) => Effect.gen(function* () {
          // Implementation
        }),
      } as const;
    }),
    dependencies: [StorageProvider.layer],
  }
) {}
```

### Core Types

```typescript
export type ActorSpec = {
  id: string;
  schema: Schema.Schema<any>;
  initial: string;
  states: Record<string, StateDefinition>;
  guards: Record<string, GuardFn>;
  actions: Record<string, ActionFn>;
};

export type StateDefinition = {
  on?: Record<string, Transition>;
  entry?: string;
  exit?: string;
};

export type Transition = string | {
  target: string;
  guard?: string;
  action?: string;
  data?: Record<string, unknown>;
};

export type ActorState = {
  id: string;
  actorType: string;
  state: string;
  context: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditEntry = {
  timestamp: Date;
  event: string;
  from: string;
  to: string;
  actor: string;
  data?: unknown;
  result: "success" | "failed";
  error?: Error;
};
```

### Error Types

```typescript
export class ActorError extends Data.TaggedError<"ActorError"> {}
export class GuardFailedError extends Data.TaggedError<"GuardFailedError"> {}
export class TransitionNotAllowedError extends Data.TaggedError<"TransitionNotAllowedError"> {}
export class StorageError extends Data.TaggedError<"StorageError"> {}
export class SpecError extends Data.TaggedError<"SpecError"> {}
export class ValidationError extends Data.TaggedError<"ValidationError"> {}
```

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| State transition latency | <1ms (in-memory) | Responsiveness |
| Spec validation | <10ms | Development feedback |
| Audit trail queries | <100ms (1000 entries) | Operational visibility |
| TypeScript strict mode | 100% compliance | Type safety |
| Test coverage | ≥90% | Reliability |
| Agent parseable | Clear contracts, examples | AI extensibility |
| Zero external deps | (except Effect) | Composability |

---

## Success Criteria (v1.0)

- [ ] All core capabilities implemented and tested
- [ ] ≥90% test coverage (unit + integration + golden)
- [ ] Zero TypeScript errors; full strict mode
- [ ] Both API styles (Effect.Service + Class) working
- [ ] ARCHITECTURE.md and examples documented
- [ ] Integration: effect-env and Wetware CLI validated
- [ ] Agents can implement new actor types from spec alone

---

## Roadmap

### v1.0 (MVP)
- Single-region statecharts (no nesting, no parallel yet)
- JSON-based specs
- Core providers (fs-json, Notion)
- Effect.Service + Class API

### v1.1 (Polish & Integration)
- Integration with effect-env, effect-actor CLI
- Performance optimization
- Community feedback
- Enhanced examples

### v1.2+ (Advanced)
- Nested states
- Parallel regions
- Sagas and compensations
- Distributed actor coordination