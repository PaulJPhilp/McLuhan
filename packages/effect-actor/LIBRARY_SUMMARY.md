# effect-actor: 1-Page Library Summary

## Overview

**effect-actor** is an Effect-native actor orchestration framework that brings proven statechart semantics to the Effect ecosystem. It enables type-safe, composable state machine orchestration with built-in persistence, audit trails, and observability—inspired by xState but designed specifically for functional programming with zero external dependencies.

## Core Problem Solved

Complex workflows and state management in distributed systems require:

- Type-safe state transitions with compile-time guarantees
- Hierarchical state organization with guards and actions
- Persistent state with audit trails for compliance and debugging
- Seamless integration with functional programming patterns
- Native observability (logging, tracing, metrics)

effect-actor solves these by providing a **statechart framework built on Effect's functional abstractions**.

## Key Features

| Feature | Description |
|---------|-------------|
| **Effect-Native** | Built for Effect >= 3.18.4 with zero external dependencies |
| **Type Safety** | Full TypeScript inference + Effect.Schema runtime validation |
| **Statecharts** | Hierarchical states, guards, actions, transitions with declarative syntax |
| **Persistence** | Built-in state snapshots, versioning, and audit trails |
| **Composition** | Effect layers, dependency injection, service integration |
| **Observability** | Native Effect logging, distributed tracing, metrics |
| **Providers** | Pluggable storage (PostgreSQL, Notion, File), compute, policy, observability backends |

## Architecture

```text
effect-actor
├── actor/        → Runtime state management, service orchestration
├── machine/      → Transition execution, state evaluation
├── spec/         → Actor specification (states, events, guards, actions)
├── providers/    → Storage, compute, observability, policy implementations
└── errors.ts     → Tagged error types for Effect error handling
```

**Data Flow**: Event → Actor Service → Spec Validation → Machine Transition → Provider Operations → Persisted State

## Quick Example

```typescript
import { Effect } from "effect";
import { createActorSpec } from "effect-actor/spec";
import { ActorService } from "effect-actor/actor";

const TodoSpec = createActorSpec({
  id: "todo",
  initial: "pending",
  states: {
    pending: { on: { START: { target: "in-progress" } } },
    "in-progress": { on: { COMPLETE: { target: "completed" } } },
    completed: {}
  }
});

const program = Effect.gen(function* () {
  const service = yield* ActorService;
  yield* service.register(TodoSpec);
  const result = yield* service.execute({
    actorType: "todo",
    actorId: "task-1",
    event: "START"
  });
  console.log(`${result.from} → ${result.to}`);
});
```

## Why effect-actor vs Alternatives

| Aspect | xState | effect-actor |
|--------|--------|--------------|
| **Design** | Standalone state machine | Effect-integrated orchestration |
| **Composition** | Plugins/middleware | Effect layers + DI |
| **Type Safety** | TypeScript inference | Effect.Schema + stricter validation |
| **Runtime** | JavaScript VM | Effect runtime (async/concurrent) |
| **Error Handling** | Error channel | Tagged errors in Effect.Effect<T, E> |
| **Dependencies** | Self-contained | Effect only |

## Use Cases

- **Workflow Engines**: Multi-step processes with state validation (hiring, content production, feature rollout)
- **Saga Patterns**: Distributed transactions with compensating actions
- **Event Sourcing**: Immutable state transitions with audit trails
- **Policy Enforcement**: Guard-based authorization and validation gates
- **Long-Running Processes**: Actor per entity with persistence and recovery

## Core Concepts

- **Actor**: Isolated entity with its own state machine instance and lifecycle
- **Spec**: Machine definition (states, events, transitions, guards, actions)
- **State**: Current actor state + context + version + timestamps
- **Transition**: State change triggered by an event, optionally with guard/action
- **Provider**: Backend implementations for storage, compute, observability, and policy
- **Audit Trail**: Immutable log of all state transitions and context changes

## Development Status

- **Version**: 0.1.2 (early development)
- **License**: MIT
- **Package**: `effect-actor-pauljphilp`
- **Commands**: `bun run test`, `bun run build`, `bun run lint`, `bun run format`
- **Repository**: github.com/PaulJPhilp/effect-actor

## Integration Points

- **Effect Services**: Built with Effect layers for composable DI
- **Storage Backends**: PostgreSQL, Notion, File-based JSON, extensible
- **Observability**: Effect logging, distributed tracing spans
- **Type System**: Generic context types with Schema-based validation
- **Error Handling**: Effect.TaggedError for domain errors

## Strengths

- ✅ Type-safe state machine orchestration for Effect ecosystem
- ✅ Zero external dependencies beyond Effect
- ✅ Built-in persistence and audit trails
- ✅ Hierarchical state support with guards/actions
- ✅ Pluggable provider architecture
- ✅ Native Effect composition patterns

## Next Steps

- Stabilize core APIs (currently 0.1.x)
- Expand provider implementations
- Add distributed actor coordination
- Performance optimization for high-throughput scenarios
