effect-actor – Implementation Plan

## Overview

**effect-actor** will be built in three phases, each with clear deliverables, success criteria, and integration points.

---

## Phase 1: Core Actor SDK (Weeks 1-2)

### Deliverables

**Core Infrastructure**
- [ ] Project structure (Turborepo, Bun setup, Biome config, TypeScript)
- [ ] Package.json with dependencies (Effect, xState)
- [ ] Build pipeline (Vite, TypeScript declarations)
- [ ] Test infrastructure (Vitest, Happy DOM, coverage)

**Spec System**
- [ ] ActorSpec type definitions (`src/spec/types.ts`)
- [ ] Spec builder helper (`createActorSpec`)
- [ ] Spec validator (validate states, transitions, guards, actions)
- [ ] SpecRegistry service

**State Machine Execution**
- [ ] xState machine builder (convert ActorSpec to xState config)
- [ ] Transition executor (guard evaluation, action execution, context transformation)
- [ ] TransitionResult type

**Core Services (Effect.Service)**
- [ ] ActorService main orchestrator
  - `execute(command)` – Execute command, persist state, record audit
  - `query(actorType, actorId)` – Get current state
  - `list(actorType, filter)` – List actors by status, date, etc.
  - `getHistory(actorType, actorId)` – Get audit trail
  - `canTransition(actorType, actorId, event)` – Check if transition allowed
  - `getSpec(actorType)` – Get actor spec
- [ ] StorageProvider interface (save, load, query, getHistory)
- [ ] ComputeProvider service (now, uuid, estimateReadingTime)
- [ ] PolicyProvider service (canExecute, retryPolicy, rateLimitPolicy)

**Error Types**
- [ ] ActorError (base)
- [ ] GuardFailedError
- [ ] TransitionNotAllowedError
- [ ] ValidationError
- [ ] StorageError
- [ ] SpecError
- [ ] All tagged with Data.TaggedError

**Class API (Promise Bridge)**
- [ ] ActorWrapper base class
- [ ] ContentProductionActor (example)
- [ ] HiringPipelineActor (example)

**Storage Backend (fs-json)**
- [ ] FsJsonStorageProvider implementation
- [ ] Directory structure for actor state
- [ ] Audit trail persistence
- [ ] Query filtering

**Audit Trail**
- [ ] AuditEntry type
- [ ] AuditLog service
- [ ] Audit recording on every transition
- [ ] History querying

**Unit Tests**
- [ ] Spec builder tests
- [ ] Spec validator tests
- [ ] xState machine executor tests
- [ ] Guard evaluation tests
- [ ] Action execution tests
- [ ] Error handling tests
- [ ] Storage provider tests
- [ ] ≥70% coverage

**Documentation**
- [ ] README with quick start
- [ ] Basic API overview
- [ ] Example: Content workflow
- [ ] Error handling guide

### Key Files to Create

packages/effect-xstate/

├── src/

│   ├── index.ts                     # Main exports

│   ├── actor/

│   │   ├── index.ts

│   │   ├── service.ts               # ActorService

│   │   ├── wrapper.ts               # ActorWrapper base class

│   │   ├── content.ts               # ContentProductionActor

│   │   ├── hiring.ts                # HiringPipelineActor

│   │   └── types.ts                 # Command, ActorState, etc.

│   ├── spec/

│   │   ├── index.ts

│   │   ├── builder.ts               # createActorSpec

│   │   ├── validator.ts             # validateSpec

│   │   ├── registry.ts              # SpecRegistry service

│   │   └── types.ts                 # ActorSpec, StateDefinition, etc.

│   ├── machine/

│   │   ├── index.ts

│   │   ├── executor.ts              # xState setup, transition logic

│   │   ├── transition.ts            # Guard/action execution

│   │   └── types.ts                 # TransitionResult, etc.

│   ├── providers/

│   │   ├── index.ts

│   │   ├── storage.ts               # StorageProvider interface

│   │   ├── compute.ts               # ComputeProvider service

│   │   ├── policy.ts                # PolicyProvider service

│   │   └── backends/

│   │       └── fs-json.ts           # FsJsonStorageProvider

│   ├── errors.ts                    # All error types

│   ├── audit.ts                     # AuditEntry, AuditLog service

│   ├── observability.ts             # Logging/metrics helpers

│   └── tests/

│       ├── unit/

│       │   ├── spec.test.ts

│       │   ├── machine.test.ts

│       │   ├── actor.test.ts

│       │   ├── providers.test.ts

│       │   └── errors.test.ts

│       ├── integration/

│       │   └── workflows.test.ts

│       └── setup.ts

├── package.json

├── tsconfig.json

├── vitest.config.ts

├── biome.jsonc

└── README.md


	### Success Criteria
	
	- [ ] `bun test` passes with ≥70% coverage
	- [ ] No TypeScript errors (strict mode)
	- [ ] Zero Biome linting issues
	- [ ] Build succeeds with declarations
	- [ ] All core services working (Effect.Service pattern)
	- [ ] Both APIs functional (Effect.Service + Class wrapper)
	- [ ] fs-json backend persists and retrieves state
	- [ ] Audit trail recording and querying works
	- [ ] Example actors (Content, Hiring) implemented and tested
	- [ ] README demonstrates basic usage
	
	### Agent Tasks (Sequenced)
	
	1. **Setup** (Day 1)
	   - Initialize Turborepo, Bun, TypeScript, Biome
	   - Create package structure
	   - Configure Vitest, tsconfig, build
	
	2. **Types & Specs** (Day 1-2)
	   - Define ActorSpec, StateDefinition, Transition types
	   - Build spec validator
	   - Create SpecRegistry service
	   - Write spec tests
	
	3. **Machine Execution** (Day 2-3)
	   - Build xState machine from ActorSpec
	   - Implement guard evaluation
	   - Implement action execution (context transformation)
	   - Write machine tests
	
	4. **Core Services** (Day 3-4)
	   - Implement ActorService (main orchestrator)
	   - Implement StorageProvider interface
	   - Implement ComputeProvider
	   - Implement PolicyProvider
	   - Write service tests
	
	5. **Storage Backend** (Day 4-5)
	   - Implement FsJsonStorageProvider
	   - Implement audit trail persistence
	   - Write backend tests
	
	6. **Error Types & Class API** (Day 5)
	   - Define all error types (tagged)
	   - Create ActorWrapper base class
	   - Create ContentProductionActor example
	   - Create HiringPipelineActor example
	
	7. **Integration Tests** (Day 6)
	   - Full workflow tests (execute → persist → audit)
	   - Error recovery tests
	   - Multi-step workflows
	
	8. **Documentation** (Day 6-7)
	   - Update README
	   - Add quick start examples
	   - Document API surface
	   - Add error handling guide
	
	---
	
	## Phase 2: Golden Fixtures & Architecture (Weeks 3-4)
	
	### Deliverables
	
	**Golden Fixtures (JSONC)**
	- [ ] `content-production.jsonc` – Content workflow test cases
	- [ ] `hiring-pipeline.jsonc` – Hiring pipeline test cases
	- [ ] `feature-rollout.jsonc` – Feature rollout test cases
	- [ ] Each with `__metadata` describing expected behavior
	
	**Golden Fixture Tests**
	- [ ] Metadata-driven test execution
	- [ ] Backend-specific testing (all state transitions validated)
	- [ ] Round-trip validation (state → persist → load → state)
	- [ ] Error case validation
	
	**Integration Examples**
	- [ ] Error recovery patterns (catchTag, orElse, retry)
	- [ ] Multi-step workflows (chained transitions)
	- [ ] Audit trail queries and replays
	- [ ] Concurrent actor operations (Effect.all)
	
	**Documentation**
	- [ ] ARCHITECTURE.md (complete technical design)
	- [ ] Extensibility guide (add new actor types, backends)
	- [ ] Error handling patterns with examples
	- [ ] Observability guide (logging, metrics, tracing)
	- [ ] Testing patterns
	
	**Polish**
	- [ ] Performance benchmarks (simple vitest bench)
	- [ ] Code cleanup and consistency
	- [ ] Enhanced error messages with recovery hints
	- [ ] README updates with Phase 2 examples
	
	### Key Files to Create/Update

packages/effect-xstate/

├── src/

│   ├── tests/

│   │   ├── integration/

│   │   │   ├── error-recovery.test.ts    # catchTag, orElse patterns

│   │   │   ├── multi-step.test.ts        # Chained transitions

│   │   │   └── audit-trail.test.ts       # Query and replay

│   │   ├── golden.test.ts                # Golden fixture tests

│   │   ├── fixtures/

│   │   │   ├── content-production.jsonc

│   │   │   ├── hiring-pipeline.jsonc

│   │   │   └── feature-rollout.jsonc

│   │   └── performance.test.ts           # Benchmarks (optional)

│   └── observability.ts                  # Enhanced logging/metrics

├── ARCHITECTURE.md                       # Technical design document

├── TESTING.md                            # Testing patterns

├── EXTENSIBILITY.md                      # How to extend

├── README.md                             # Updated with examples

└── docs/

├── ERROR_HANDLING.md

├── OBSERVABILITY.md

└── EXAMPLES.md


	### Success Criteria
	
	- [ ] `bun test` passes with ≥90% coverage
	- [ ] No TypeScript errors or warnings
	- [ ] Clean Biome linting
	- [ ] Golden fixtures cover all actor types and transitions
	- [ ] Error recovery patterns documented and tested
	- [ ] ARCHITECTURE.md comprehensive and agent-parseable
	- [ ] All integration tests passing
	- [ ] Performance targets met (<1ms state transition in-memory)
	
	### Agent Tasks (Sequenced)
	
	1. **Golden Fixtures** (Day 1-2)
	   - Define fixture structure (JSONC with `__metadata`)
	   - Create content-production.jsonc (30+ test cases)
	   - Create hiring-pipeline.jsonc (20+ test cases)
	   - Create feature-rollout.jsonc (15+ test cases)
	
	2. **Golden Fixture Tests** (Day 2-3)
	   - Implement metadata-driven test runner
	   - Validate all transitions per fixture
	   - Test round-trip persistence
	   - Test error cases
	
	3. **Integration Examples** (Day 3-4)
	   - Write error-recovery.test.ts (catchTag, orElse, retry patterns)
	   - Write multi-step.test.ts (chained transitions)
	   - Write audit-trail.test.ts (query, filter, replay)
	   - Write concurrent operations tests
	
	4. **Performance Benchmarks** (Day 4)
	   - Measure state transition latency
	   - Measure spec validation latency
	   - Measure storage operations
	   - Document results
	
	5. **ARCHITECTURE.md** (Day 4-5)
	   - Document all layers (Spec, Machine, Providers, etc.)
	   - Include code examples
	   - Document Error Handling Strategy
	   - Document Extension Points
	
	6. **Additional Docs** (Day 5-6)
	   - ERROR_HANDLING.md with patterns
	   - OBSERVABILITY.md with logging/metrics
	   - EXTENSIBILITY.md with "add new actor type" guide
	   - TESTING.md with testing patterns
	
	7. **Code Polish** (Day 6)
	   - Error message improvements (helpful, actionable)
	   - Consistent code style
	   - README updates with Phase 2 examples
	   - Final review and cleanup
	
	---
	
	## Phase 3: Integration & Release (Weeks 5-6)
	
	### Deliverables
	
	**Integration with effect-env**
	- [ ] Config schema using ActorSpec patterns
	- [ ] ConfigActor for managing application state
	- [ ] Integration tests with real config files
	- [ ] Validation and error recovery
	
	**Integration with Wetware CLI**
	- [ ] ContentProductionActor used for workflow
	- [ ] CLI commands: `wetware plan`, `wetware publish`, etc.
	- [ ] State querying: `wetware list`, `wetware show`
	- [ ] Audit trail: `wetware history`
	
	**HTTP Server Wrapper** (Optional)
	- [ ] ExpressJS-like server exposing ActorService
	- [ ] POST /actors/{actorType}/{actorId}/command
	- [ ] GET /actors/{actorType}/{actorId}
	- [ ] GET /actors/{actorType}?status=...
	- [ ] GET /actors/{actorType}/{actorId}/history
	
	**MCP Server Integration** (Optional)
	- [ ] MCP tools for Claude integration
	- [ ] Query actor state
	- [ ] Execute commands
	- [ ] View audit trail
	
	**Release**
	- [ ] Final README and API docs
	- [ ] CHANGELOG
	- [ ] Version tag (v0.1.0)
	- [ ] Publish to npm
	- [ ] Community announcement
	
	### Key Files to Create/Update

packages/effect-xstate/

├── CHANGELOG.md

├── LICENSE

├── README.md                           # Final version

└── docs/

├── CHANGELOG.md

├── GETTING_STARTED.md

└── FAQ.md

Integration examples (in separate apps or docs)


├── examples/

│   ├── content-workflow.ts             # How to use ContentProductionActor

│   ├── hiring-pipeline.ts              # How to use HiringPipelineActor

│   └── custom-actor.ts                 # How to build your own actor


	### Success Criteria
	
	- [ ] effect-env successfully uses ActorService for config
	- [ ] Wetware CLI fully operational with effect-xstate
	- [ ] All integration tests passing
	- [ ] Package published to npm
	- [ ] Documentation complete and polished
	- [ ] Zero outstanding issues from v1.0 scope
	- [ ] Community ready for adoption
	
	### Agent Tasks (Sequenced)
	
	1. **effect-env Integration** (Day 1-2)
	   - Define ConfigActor spec
	   - Integrate with config loading
	   - Write integration tests
	   - Validate with real config scenarios
	
	2. **Wetware CLI Integration** (Day 2-3)
	   - Map CLI commands to actor transitions
	   - Implement query operations
	   - Implement audit trail commands
	   - End-to-end testing
	
	3. **HTTP Server** (Day 3-4, Optional)
	   - Create HTTP wrapper over ActorService
	   - Route handler for /actors/* endpoints
	   - Request validation and error mapping
	   - Tests
	
	4. **MCP Server** (Day 4, Optional)
	   - MCP tool definitions
	   - Query and command execution
	   - Audit trail retrieval
	   - Integration with Claude
	
	5. **Release Prep** (Day 5)
	   - CHANGELOG generation
	   - Final README review
	   - License and legal
	   - Version bump to v0.1.0
	
	6. **Publishing** (Day 5-6)
	   - npm publish
	   - GitHub release
	   - Community announcement
	   - Documentation site (if applicable)
	
	---
	
	## Rollout Timeline
	
	| Phase | Duration | Start | End | Lead | Status |
	|-------|----------|-------|-----|------|--------|
	| Phase 1: Core | 2 weeks | Week 1 | Week 2 | Agent | ⏳ To Do |
	| Phase 2: Polish | 2 weeks | Week 3 | Week 4 | Agent | ⏳ To Do |
	| Phase 3: Integration | 2 weeks | Week 5 | Week 6 | Paul + Agent | ⏳ To Do |
	
	---
	
	## Dependencies & Blockers
	
	| Dependency | Status | Impact | Notes |
	|-----------|--------|--------|-------|
	| Turborepo setup | Ready | Phase 1 | Use existing from effect-json |
	| Effect latest | Ready | All phases | Ensure xState compatible |
	| xState v5 | Ready | Phase 1 | Core dependency |
	| effect-json | Ready | Phase 3 | For state persistence |
	| effect-env | Ready | Phase 3 | For integration |
	| Wetware CLI | Design | Phase 3 | Depends on ActorSDK |
	
	---
	
	## Risk Mitigation
	
	### Risk: xState API Changes
	
	**Mitigation**: Pin xState to v5.x; maintain compatibility layer if needed
	
	### Risk: Spec Validation Complexity
	
	**Mitigation**: Start simple (no nested/parallel); add in v1.1
	
	### Risk: Storage Provider Inconsistencies
	
	**Mitigation**: Define StorageProvider contract clearly; test with multiple backends early
	
	### Risk: Performance Degradation
	
	**Mitigation**: Benchmark early and often; profile hot paths in Phase 1
	
	### Risk: Integration Delays
	
	**Mitigation**: Have effect-env and Wetware teams ready for parallel integration
	
	---
	
	## Rollback Plan
	
	- **Phase 1 issues**: Simplify ActorService (remove optional features); focus on core execute/query
	- **Phase 2 issues**: Defer golden fixtures; release with unit tests only; ship Phase 1.5
	- **Phase 3 issues**: Release ActorSDK independently; delay CLI integration to Phase 4
	
	---
	
	## Success Metrics (Post-Launch)
	
	- [ ] effect-xstate npm package published and installable
	- [ ] ≥50 npm weekly downloads (week 1)
	- [ ] ≥100 npm weekly downloads (month 1)
	- [ ] Zero critical bugs reported
	- [ ] Community adoption: at least 1 external project using it
	- [ ] Agents can implement new actor types without assistance
	- [ ] All integration targets (effect-env, Wetware) successfully using it
	- [ ] ≥90% test coverage maintained
	
	---
	
	## Post-Launch Roadmap
	
	### v1.1 (Month 2-3)
	- Performance optimization and profiling
	- Enhanced error messages with recovery hints
	- Community feedback integration
	- Extended examples and tutorials
	- Nested state support
	
	### v1.2 (Month 3-4)
	- Parallel state regions
	- Sagas and compensating transactions
	- HTTP server wrapper
	- MCP server integration
	
	### v2.0 (Month 6+)
	- Distributed actor coordination
	- Event replay and temporal queries
	- Custom state machine backends
	- GraphQL API generation
	- Visual workflow designer
	
	---
	
	## Resources & Roles
	
	**Agent Responsibilities**:
	- Implement core ActorSDK (Phases 1-2)
	- Write unit and integration tests
	- Generate ARCHITECTURE.md and docs
	- Support CLI integration (Phase 3)
	
	**Paul Responsibilities**:
	- Review and approve designs at each phase
	- Integration with effect-env and Wetware
	- Community communication
	- Strategic decisions for v2.0+
	
	---
	
	## Communication Plan
	
	- **Phase 1 Checkpoint**: Day 7 (progress review)
	- **Phase 1 Complete**: Week 2 (demo of working SDK)
	- **Phase 2 Checkpoint**: Week 3 (golden fixtures review)
	- **Phase 2 Complete**: Week 4 (architecture review)
	- **Phase 3 Kickoff**: Week 5 (integration planning)
	- **Phase 3 Complete**: Week 6 (release)
	
	---
	
	## Conclusion
	
	This phased approach ensures:
	1. **Solid foundation** (Phase 1) with all core features
	2. **Battle-tested robustness** (Phase 2) with comprehensive fixtures and docs
	3. **Production readiness** (Phase 3) with real integration and adoption
	
	Each phase has clear criteria for success and well-defined next steps.