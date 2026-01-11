# effect-actor – Market Requirements Document

## Executive Summary

**effect-actor** is an Effect-native state machine orchestration framework for managing entity lifecycles with specification-driven design, pluggable providers, and built-in audit trails. It enables developers to build robust, type-safe, auditable state machines for entities (content workflows, hiring pipelines, feature rollouts, etc.) with pluggable providers for storage, computation, policy, and observability.

### The Problem

Building stateful systems requires managing:
- Complex state transitions with guards and side effects
- Reliable persistence and audit trails
- Type-safe domain models with validation
- Multiple backends (Notion, databases, files, etc.)
- Observability, error recovery, and retry logic
- Testability and deterministic behavior

Currently, developers either:
- **Roll their own state machines** (error-prone, inconsistent, not reusable)
- **Use heavy orchestration frameworks** (overkill for entity workflows, operational complexity)
- **Hardcode business logic** (tight coupling, hard to test, difficult to evolve)

There's no principled, composable, Effect-native way to orchestrate entity state machines with clear contracts.

### The Solution

**effect-actor** provides:
- **State machine orchestration** with statechart semantics (type-safe, composable)
- **Effect-native execution** (lazy, observable, testable, error-channel semantics)
- **Pluggable providers** (Storage, Compute, Policy, Observability)
- **Dual API** (Effect.Service for power users, Class wrapper for non-Effect developers)
- **Specification-driven design** (specs are TypeScript, not YAML or JSON)
- **Audit trail and event sourcing** (every transition is tracked and queryable)
- **Agent-ready** (clear contracts, patterns that AI can understand and extend)

---

## Target Users & Personas

### Persona 1: Paul (Effect-First Systems Engineer)
- **Profile**: Building complex, reliable systems with Effect (effect-env, effect-json, Writing Buddy, Wetware)
- **Pain point**: Managing entity lifecycles (ideas → articles, candidates → hired) requires custom orchestration logic
- **Need**: A composable, Effect-native framework for state machines; testable, observable, auditable
- **Success metric**: Can model content workflow, hiring pipeline, and feature rollout with shared, reusable patterns; no custom state machine logic

### Persona 2: TypeScript Team (Non-Effect Background)
- **Profile**: Building applications with TypeScript; familiar with async/await, promises, but not Effect
- **Pain point**: State machines are complex; existing libraries (Redux, XState directly) lack type safety at domain level
- **Need**: Clean, intuitive API for managing entity state; type-safe domain models; Promise-based interface
- **Success metric**: Can define workflows and query state without learning Effect; understands `await actor.execute(command)`

### Persona 3: AI Coding Agents (Claude, etc.)
- **Profile**: Reading specs, implementing workflows, writing tests
- **Pain point**: Ambiguous contracts, multiple patterns for same problem, unclear error handling
- **Need**: Clear, prescriptive specs for state machine definition; consistent patterns across actors
- **Success metric**: Can read ARCHITECTURE.md and implement a new actor type (e.g., FeatureRolloutActor) without asking clarifying questions

### Persona 4: Infrastructure/DevOps Engineer
- **Profile**: Managing event sourcing, audit trails, migrations, system observability
- **Pain point**: Black-box state machines; hard to debug, hard to reason about failures
- **Need**: Observable, auditable state transitions; structured logging; event sourcing hooks
- **Success metric**: Can trace any entity's lifecycle, understand why a transition failed, replay events

---

## Market Scope & Positioning

### Primary Use Cases
1. **Content production workflows** (Idea → Planned → Draft → Review → Published)
2. **Hiring pipelines** (Candidate → Applied → Interviewing → Offered → Hired)
3. **Feature rollouts** (Feature → Planning → Development → Testing → Released)
4. **Event-driven systems** (Any stateful entity with discrete transitions)
5. **Long-running processes** (Async tasks, batch jobs, background workflows)

### Market Position
- **Not a replacement for**: Temporal, Durable Functions (different scale/complexity)
- **Not a replacement for**: Apache Airflow (different use case; Airflow is DAG-based)
- **Complements**: Effect ecosystem, Zod/Effect.Schema
- **Competes with**: Home-grown state machines, Redux, simple state management, xState
- **Integrates with**: effect-json (persistence), effect-env (config), Notion, databases

### Competitive Advantages
1. **Effect-native** — First-class Effect integration; lazy, composable, observable
2. **Specification-driven** — TypeScript specs, not YAML or configuration
3. **Provider architecture** — Storage, Compute, Policy all swappable
4. **Clean semantics** — Statechart model without external weight
5. **Audit trail built-in** — Event sourcing patterns native to design
6. **Agent-ready** — Clear contracts, testable, easy to extend

---

## Success Criteria

### Functional
- [ ] Define state machine specs as TypeScript objects
- [ ] Execute state transitions with typed guards and actions
- [ ] Persist state via pluggable storage providers
- [ ] Support loops, conditionals, and state nesting (v1+)
- [ ] Provide audit trail of all transitions
- [ ] Support multi-actor coordination (workflow orchestration)

### Non-Functional
- [ ] All operations Effect-native (lazy, composable, observable)
- [ ] Full TypeScript strict mode compliance
- [ ] Zero external dependencies (except Effect)
- [ ] ≥90% test coverage (unit + integration + golden)
- [ ] Agent-parseable documentation (clear, machine-readable specs)
- [ ] Sub-millisecond state transitions (in-memory)

### Experience
- [ ] DX: Non-Effect developers use Class API naturally (`await actor.execute(...)`)
- [ ] DX: Effect developers access Service directly for composition
- [ ] DX: Agents can implement new actor types from ARCHITECTURE.md alone
- [ ] DX: Error messages are actionable with recovery suggestions
- [ ] DX: Audit trail is queryable and understandable

---

## Out of Scope (v1.0)

- Distributed actors (multi-machine coordination)
- Sagas and compensating transactions (future layer on top)
- Complex parallel regions (v1.2+)
- Nested state machines (v1.1+)
- GraphQL API or REST auto-generation
- Visual workflow designers
- Real-time collaboration features

---

## Timeline & Phasing

- **Phase 1**: Core StateMachine SDK (Effect-native executor, Effect.Service, Class API, basic providers)
- **Phase 2**: Golden fixtures, ARCHITECTURE.md, error recovery patterns, integration examples
- **Phase 3**: Integration with effect-env, CLI, HTTP server, MCP
- **Phase 4+**: Advanced features (parallel states, nested, sagas, distributed)

---

## Success Metrics (Post-Launch)

- effect-env and CLI adopt effect-actor for workflow management
- Writing Buddy uses effect-actor for editorial workflows
- Agents can implement new actor types without clarifying questions
- Community contributions: new actor types, provider implementations
- ≥500 npm weekly downloads (month 3)