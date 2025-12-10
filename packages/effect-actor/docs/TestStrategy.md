effect-actor – Test Strategy

## Testing Philosophy
	
	**"Tests are executable specifications."**
	
	All tests:
	- Are written in Effect, using `Effect.gen` (no `_` adopter)
	- Use golden fixtures (JSONC format with `__metadata`) for clarity
	- Run deterministically (no real I/O, mocked providers)
	- Are agent-parseable (clear patterns, consistent structure)
	- Validate both happy paths and error cases
	- Serve as documentation for expected behavior
	
	---
	
	## Test Hierarchy
	
	### 1. Unit Tests (40% coverage)
	
	**Goal**: Verify individual functions and services in isolation.
	
	**Scope**:
	- Spec builder and validator
	- Guard evaluation logic
	- Action execution (context transformation)
	- Error construction and formatting
	- xState machine builder
	- Provider interfaces
	- Utility functions
	
	**Example**:
	```typescript
	// src/spec/__tests__/validator.test.ts
	import { describe, it, expect } from "vitest";
	import { Effect } from "effect";
	import { validateSpec } from "../validator";
	import { SpecValidationError } from "../../errors";
	
	describe("validateSpec", () => {
	  it("should pass for valid spec", async () => {
	    const spec = createActorSpec({
	      id: "test",
	      schema: TestSchema,
	      initial: "State1",
	      states: {
	        State1: { on: { GO: "State2" } },
	        State2: {},
	      },
	      guards: {},
	      actions: {},
	    });
	
	    const result = await Effect.runPromise(Effect.either(validateSpec(spec)));
	    expect(result._tag).toBe("Right");
	  });
	
	  it("should fail if initial state not defined", async () => {
	    const spec = createActorSpec({
	      id: "test",
	      schema: TestSchema,
	      initial: "NonExistent",
	      states: {
	        State1: { on: { GO: "State2" } },
	        State2: {},
	      },
	      guards: {},
	      actions: {},
	    });
	
	    const result = await Effect.runPromise(Effect.either(validateSpec(spec)));
	    expect(result._tag).toBe("Left");
	    if (result._tag === "Left") {
	      expect(result.left).toBeInstanceOf(SpecValidationError);
	      expect(result.left.reason).toContain("Initial state");
	    }
	  });
	
	  it("should fail if transition targets undefined state", async () => {
	    const spec = createActorSpec({
	      id: "test",
	      schema: TestSchema,
	      initial: "State1",
	      states: {
	        State1: { on: { GO: "UndefinedState" } },
	      },
	      guards: {},
	      actions: {},
	    });
	
	    const result = await Effect.runPromise(Effect.either(validateSpec(spec)));
	    expect(result._tag).toBe("Left");
	    if (result._tag === "Left") {
	      expect(result.left.reason).toContain("unknown state");
	    }
	  });
	
	  it("should fail if referenced guard not defined", async () => {
	    const spec = createActorSpec({
	      id: "test",
	      schema: TestSchema,
	      initial: "State1",
	      states: {
	        State1: {
	          on: { GO: { target: "State2", guard: "undefinedGuard" } },
	        },
	        State2: {},
	      },
	      guards: {},
	      actions: {},
	    });
	
	    const result = await Effect.runPromise(Effect.either(validateSpec(spec)));
	    expect(result._tag).toBe("Left");
	  });
	});
	```
	
	### 2. Integration Tests (35% coverage)
	
	**Goal**: Verify workflows combining multiple components (spec, machine, service, storage).
	
	**Scope**:
	- Full command execution pipeline (validate → guard → action → persist → audit)
	- State transitions with context transformation
	- Guard evaluation blocking/allowing transitions
	- Action execution modifying context
	- Error propagation and recovery
	- Multi-step workflows (chained transitions)
	- Concurrent operations (Effect.all)
	
	**Example**:
	```typescript
	// src/__tests__/integration/workflows.test.ts
	import { describe, it, expect } from "vitest";
	import { Effect } from "effect";
	import { ActorService } from "../../actor/service";
	import { ContentSchema, contentSpec } from "../../fixtures/content-spec";
	import { mockStorageProvider, mockComputeProvider } from "../../testing";
	
	describe("Content Production Workflow", () => {
	  it("should execute full workflow: Idea → Planned → Draft → Review → Published", async () => {
	    const effect = Effect.gen(function* () {
	      const storage = yield* mockStorageProvider;
	      const actor = yield* ActorService;
	
	      // Create initial state (Idea)
	      const initial = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "CREATE",
	        data: { title: "My Article", id: "article-1" },
	      });
	      expect(initial.state).toBe("Idea");
	
	      // Transition: Idea → Planned
	      const planned = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "PLAN",
	        data: { publishTargetDate: new Date("2025-12-01") },
	      });
	      expect(planned.state).toBe("Planned");
	      expect(planned.context.publishTargetDate).toEqual(
	        new Date("2025-12-01")
	      );
	
	      // Transition: Planned → Draft
	      const draft = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "START_DRAFT",
	      });
	      expect(draft.state).toBe("Draft");
	
	      // Transition: Draft → Review (with guard check)
	      const review = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "SUBMIT_REVIEW",
	        data: { wordCount: 2000, readingTime: 10 },
	      });
	      expect(review.state).toBe("Review");
	
	      // Transition: Review → Published
	      const published = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "APPROVE_PUBLISH",
	      });
	      expect(published.state).toBe("Published");
	      expect(published.context.publishDate).toBeDefined();
	
	      return { initial, planned, draft, review, published };
	    }).pipe(
	      Effect.provideLayer(ActorService.layer),
	      Effect.provideLayer(mockStorageProvider.layer),
	      Effect.provideLayer(mockComputeProvider.layer)
	    );
	
	    const result = await Effect.runPromise(effect);
	    expect(result.published.state).toBe("Published");
	  });
	
	  it("should fail transition if guard fails", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Try to submit review without minimum word count
	      const result = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "SUBMIT_REVIEW",
	        data: { wordCount: 100, readingTime: 2 }, // Below minimum
	      }).pipe(Effect.either);
	
	      return result;
	    }).pipe(
	      Effect.provideLayer(ActorService.layer),
	      Effect.provideLayer(mockStorageProvider.layer)
	    );
	
	    const result = await Effect.runPromise(effect);
	    expect(result._tag).toBe("Left");
	    if (result._tag === "Left") {
	      expect(result.left).toBeInstanceOf(GuardFailedError);
	    }
	  });
	
	  it("should support state revert (Draft → Planned)", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Move to Draft
	      yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "START_DRAFT",
	      });
	
	      // Revert to Planned
	      const reverted = yield* actor.execute({
	        actorType: "content-production",
	        actorId: "article-1",
	        event: "REVERT",
	      });
	
	      expect(reverted.state).toBe("Planned");
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	});
	```
	
	### 3. Golden Tests (20% coverage)
	
	**Goal**: Validate against known-good fixtures and expected outcomes.
	
	**Format**: JSONC files with `__metadata` describing expected behavior.
	
	**Fixtures**:

src/tests/fixtures/

├── content-production.jsonc

├── hiring-pipeline.jsonc

└── feature-rollout.jsonc


	**Example Fixture** (`content-production.jsonc`):
	```jsonc
	{
	  // Valid: Full workflow from Idea to Published
	  "workflow_idea_to_published": {
	    "__metadata": {
	      "description": "Complete content workflow",
	      "steps": [
	        { "event": "PLAN", "data": { "publishTargetDate": "2025-12-01" }, "expectedState": "Planned" },
	        { "event": "START_DRAFT", "expectedState": "Draft" },
	        { "event": "SUBMIT_REVIEW", "data": { "wordCount": 2000 }, "expectedState": "Review" },
	        { "event": "APPROVE_PUBLISH", "expectedState": "Published" }
	      ],
	      "shouldSucceed": true
	    },
	    "initialContext": {
	      "id": "article-1",
	      "title": "My Article",
	      "status": "Idea"
	    }
	  },
	
	  // Invalid: Guard fails (insufficient word count)
	  "workflow_guard_fails_low_word_count": {
	    "__metadata": {
	      "description": "Guard fails when word count too low",
	      "steps": [
	        { "event": "START_DRAFT", "expectedState": "Draft" },
	        {
	          "event": "SUBMIT_REVIEW",
	          "data": { "wordCount": 100 },
	          "expectedState": "Review",
	          "expectedError": "GuardFailedError"
	        }
	      ],
	      "shouldSucceed": false,
	      "expectedErrorType": "GuardFailedError"
	    },
	    "initialContext": {
	      "id": "article-2",
	      "title": "Short Article",
	      "status": "Draft"
	    }
	  },
	
	  // Invalid: Transition not allowed from current state
	  "workflow_invalid_transition": {
	    "__metadata": {
	      "description": "Cannot transition from Idea to Review",
	      "event": "APPROVE_PUBLISH",
	      "expectedError": "TransitionNotAllowedError",
	      "availableTransitions": ["PLAN", "REJECT"]
	    },
	    "initialContext": {
	      "id": "article-3",
	      "title": "Another Article",
	      "status": "Idea"
	    }
	  },
	
	  // Round-trip: State persists and reloads correctly
	  "roundtrip_state_persistence": {
	    "__metadata": {
	      "description": "State persists through save and load",
	      "steps": [
	        { "event": "PLAN", "data": { "publishTargetDate": "2025-12-01" }, "expectedState": "Planned" },
	        { "operation": "save", "expectSuccess": true },
	        { "operation": "load", "expectStateMatch": true }
	      ]
	    },
	    "initialContext": {
	      "id": "article-4",
	      "title": "Persistence Test"
	    }
	  }
	}

Golden Fixture Test:


	// src/__tests__/golden.test.ts
	import { describe, it, expect } from "vitest";
	import { Effect } from "effect";
	import { ActorService } from "../actor/service";
	import fixtures from "./fixtures/content-production.jsonc";
	import { mockStorageProvider } from "../testing";
	
	describe("Golden Fixtures - Content Production", () => {
	  Object.entries(fixtures).forEach(([testName, fixture]) => {
	    it(`should handle: ${testName}`, async () => {
	      const effect = Effect.gen(function* () {
	        const actor = yield* ActorService;
	        let currentState = fixture.initialContext;
	        const results: any[] = [];
	
	        for (const step of fixture.__metadata.steps) {
	          if (step.operation === "save") {
	            // Persist state
	            yield* mockStorageProvider.save(
	              "content-production",
	              currentState.id,
	              { state: step.expectedState, context: currentState }
	            );
	            results.push({ operation: "save", success: true });
	          } else if (step.operation === "load") {
	            // Load and verify
	            const loaded = yield* mockStorageProvider.load(
	              "content-production",
	              currentState.id
	            );
	            expect(loaded.context).toEqual(currentState);
	            results.push({ operation: "load", success: true });
	          } else {
	            // Execute transition
	            const result = yield* actor.execute({
	              actorType: "content-production",
	              actorId: currentState.id,
	              event: step.event,
	              data: step.data,
	            }).pipe(Effect.either);
	
	            if (step.expectedError) {
	              expect(result._tag).toBe("Left");
	              if (result._tag === "Left") {
	                expect(result.left.constructor.name).toBe(
	                  step.expectedError
	                );
	              }
	            } else {
	              expect(result._tag).toBe("Right");
	              if (result._tag === "Right") {
	                expect(result.right.state).toBe(step.expectedState);
	                currentState = result.right.context;
	              }
	            }
	
	            results.push({
	              event: step.event,
	              state: step.expectedState,
	              success: result._tag === "Right",
	            });
	          }
	        }
	
	        return results;
	      }).pipe(
	        Effect.provideLayer(ActorService.layer),
	        Effect.provideLayer(mockStorageProvider.layer)
	      );
	
	      const results = await Effect.runPromise(effect);
	      expect(results).toBeDefined();
	
	      if (fixture.__metadata.shouldSucceed === false) {
	        const lastResult = results[results.length - 1];
	        expect(lastResult.success).toBe(false);
	      }
	    });
	  });
	});

4. Error Recovery Tests (5% coverage)


Goal: Verify error handling patterns with Effect.catchTag, orElse, retry.

Example:


	// src/__tests__/integration/error-recovery.test.ts
	import { describe, it, expect } from "vitest";
	import { Effect, Schedule } from "effect";
	import { ActorService } from "../../actor/service";
	import { GuardFailedError, TransitionNotAllowedError } from "../../errors";
	
	describe("Error Recovery Patterns", () => {
	  it("should recover from guard failure with catchTag", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Attempt transition that will fail guard
	      const recovered = yield* actor
	        .execute({
	          actorType: "content-production",
	          actorId: "article-1",
	          event: "SUBMIT_REVIEW",
	          data: { wordCount: 100 }, // Too low
	        })
	        .pipe(
	          Effect.catchTag("GuardFailedError", (err) =>
	            Effect.gen(function* () {
	              yield* Effect.logWarn(
	                `Guard failed: ${err.guard}. Adding more content.`
	              );
	              // Retry with sufficient word count
	              return yield* actor.execute({
	                actorType: "content-production",
	                actorId: "article-1",
	                event: "SUBMIT_REVIEW",
	                data: { wordCount: 2000 }, // Sufficient
	              });
	            })
	          )
	        );
	
	      expect(recovered.state).toBe("Review");
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	
	  it("should provide fallback for invalid transitions", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Try invalid transition, fall back to allowed one
	      const result = yield* actor
	        .execute({
	          actorType: "content-production",
	          actorId: "article-1",
	          event: "APPROVE_PUBLISH", // Invalid from Idea
	        })
	        .pipe(
	          Effect.catchTag("TransitionNotAllowedError", (err) =>
	            Effect.gen(function* () {
	              yield* Effect.logWarn(
	                `Transition not allowed. Available: ${err.available.join(", ")}`
	              );
	              // Perform allowed transition instead
	              return yield* actor.execute({
	                actorType: "content-production",
	                actorId: "article-1",
	                event: "PLAN",
	                data: { publishTargetDate: new Date() },
	              });
	            })
	          )
	        );
	
	      expect(result.state).toBe("Planned");
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	
	  it("should retry transient storage errors", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Retry on storage error with backoff
	      yield* actor
	        .execute({
	          actorType: "content-production",
	          actorId: "article-1",
	          event: "PLAN",
	          data: { publishTargetDate: new Date() },
	        })
	        .pipe(
	          Effect.retry(
	            Schedule.exponential("100 millis", { cap: "5 seconds" }).pipe(
	              Schedule.compose(Schedule.recurs(3)) // Max 3 retries
	            )
	          ),
	          Effect.catchTag("StorageError", (err) =>
	            Effect.gen(function* () {
	              yield* Effect.logError(
	                `Storage error after retries: ${err.operation}`
	              );
	              return yield* Effect.fail(err);
	            })
	          )
	        );
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	
	  it("should use orElse for alternative strategies", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	
	      // Try primary transition, fall back to alternative
	      yield* actor
	        .execute({
	          actorType: "content-production",
	          actorId: "article-1",
	          event: "APPROVE_PUBLISH", // Might fail
	        })
	        .pipe(
	          Effect.orElse(() =>
	            Effect.gen(function* () {
	              yield* Effect.logInfo("Primary failed, using fallback");
	              return yield* actor.execute({
	                actorType: "content-production",
	                actorId: "article-1",
	                event: "REQUEST_CHANGES",
	              });
	            })
	          )
	        );
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	
	  it("should tap into errors without modifying", async () => {
	    const effect = Effect.gen(function* () {
	      const actor = yield* ActorService;
	      const errors: Error[] = [];
	
	      yield* actor
	        .execute({
	          actorType: "content-production",
	          actorId: "article-1",
	          event: "SUBMIT_REVIEW",
	          data: { wordCount: 100 }, // Will fail
	        })
	        .pipe(
	          Effect.tapError((err) =>
	            Effect.gen(function* () {
	              errors.push(err);
	              yield* Effect.logError(`Error occurred: ${err}`);
	            })
	          ),
	          Effect.either
	        );
	
	      expect(errors.length).toBeGreaterThan(0);
	    }).pipe(Effect.provideLayer(ActorService.layer));
	
	    await Effect.runPromise(effect);
	  });
	});

5. Provider Tests (Optional - 5% coverage)


Goal: Verify provider implementations independently.

Example:


	// src/providers/__tests__/storage.test.ts
	import { describe, it, expect } from "vitest";
	import { Effect } from "effect";
	import { FsJsonStorageProvider } from "../backends/fs-json";
	import { StorageError } from "../../errors";
	
	describe("FsJsonStorageProvider", () => {
	  it("should save and load actor state", async () => {
	    const effect = Effect.gen(function* () {
	      const provider = yield* FsJsonStorageProvider({ basePath: "/tmp/test" });
	
	      const state = {
	        id: "test-1",
	        state: "Planned",
	        context: { title: "Test" },
	      };
	
	      // Save
	      yield* provider.save("content-production", "test-1", state, {
	        timestamp: new Date(),
	        event: "PLAN",
	        from: "Idea",
	        to: "Planned",
	      });
	
	      // Load
	      const loaded = yield* provider.load("content-production", "test-1");
	      expect(loaded.state).toBe("Planned");
	      expect(loaded.context.title).toBe("Test");
	    }).pipe(Effect.provideLayer(FsJsonStorageProvider({ basePath: "/tmp/test" })));
	
	    await Effect.runPromise(effect);
	  });
	
	  it("should fail gracefully on missing state", async () => {
	    const effect = Effect.gen(function* () {
	      const provider = yield* FsJsonStorageProvider({ basePath: "/tmp/test" });
	
	      const result = yield* provider
	        .load("content-production", "nonexistent")
	        .pipe(Effect.either);
	
	      expect(result._tag).toBe("Left");
	      if (result._tag === "Left") {
	        expect(result.left).toBeInstanceOf(StorageError);
	      }
	    }).pipe(Effect.provideLayer(FsJsonStorageProvider({ basePath: "/tmp/test" })));
	
	    await Effect.runPromise(effect);
	  });
	});


---

Test Coverage Targets

Category	Target	Rationale
Unit	40%	Core logic (spec, machine, errors)
Integration	35%	Workflows and component interaction
Golden	20%	Known-good fixtures and round-trips
Error Recovery	5%	Error handling patterns
Total	≥90%	High confidence and maintainability

---

Mock Providers

MockStorageProvider

	export const mockStorageProvider = Layer.succeed(StorageProvider, {
	  save: (actorType, actorId, state, audit) =>
	    Effect.gen(function* () {
	      // Store in memory
	      const key = `${actorType}:${actorId}`;
	      stateStore.set(key, state);
	      auditStore.set(key, (auditStore.get(key) ?? []).concat(audit));
	    }),
	
	  load: (actorType, actorId) =>
	    Effect.gen(function* () {
	      const key = `${actorType}:${actorId}`;
	      const state = stateStore.get(key);
	      if (!state) {
	        yield* Effect.fail(
	          new StorageError({ backend: "mock", operation: "load" })
	        );
	      }
	      return state!;
	    }),
	
	  query: (actorType, filter) =>
	    Effect.gen(function* () {
	      return Array.from(stateStore.values())
	        .filter((s) => s.state === filter.status)
	        .slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 10));
	    }),
	
	  getHistory: (actorType, actorId) =>
	    Effect.gen(function* () {
	      const key = `${actorType}:${actorId}`;
	      return auditStore.get(key) ?? [];
	    }),
	});

MockComputeProvider

	export const mockComputeProvider = Layer.succeed(ComputeProvider, {
	  now: () => Effect.succeed(new Date("2025-10-20T15:00:00Z")), // Deterministic
	  uuid: () => {
	    uuidCounter++;
	    return Effect.succeed(`test-uuid-${uuidCounter}`);
	  },
	  estimateReadingTime: (text) =>
	    Effect.succeed(Math.ceil(text.split(" ").length / 200)),
	});

MockPolicyProvider

	export const mockPolicyProvider = Layer.succeed(PolicyProvider, {
	  canExecute: () => Effect.succeed(true), // Allow all by default
	  getRetryPolicy: () => ({
	    maxAttempts: 3,
	    backoff: Schedule.exponential("10 millis"), // Fast for tests
	  }),
	  getRateLimitPolicy: () => ({
	    tokensPerSecond: 1000, // Unlimited for tests
	  }),
	});


---

Test File Organization

	src/
	├── __tests__/
	│   ├── unit/
	│   │   ├── spec.test.ts               # Spec builder, validator
	│   │   ├── machine.test.ts            # xState machine builder
	│   │   ├── actor.test.ts              # ActorService core logic
	│   │   ├── transition.test.ts         # Guard/action execution
	│   │   ├── providers.test.ts          # Provider interfaces
	│   │   └── errors.test.ts             # Error types
	│   ├── integration/
	│   │   ├── workflows.test.ts          # Full workflows
	│   │   ├── error-recovery.test.ts     # Error handling patterns
	│   │   ├── multi-step.test.ts         # Chained transitions
	│   │   ├── audit-trail.test.ts        # Query and replay
	│   │   └── concurrent.test.ts         # Effect.all patterns
	│   ├── golden.test.ts                 # Golden fixture tests
	│   ├── fixtures/
	│   │   ├── content-production.jsonc
	│   │   ├── hiring-pipeline.jsonc
	│   │   ├── feature-rollout.jsonc
	│   │   └── shared-specs.ts            # Shared fixture utilities
	│   ├── setup.ts                       # Test setup, global mocks
	│   └── performance.test.ts            # (Optional) Benchmarks
	├── testing.ts                         # Public testing utilities
	│   ├── mockStorageProvider
	│   ├── mockComputeProvider
	│   ├── mockPolicyProvider
	│   ├── createTestActorState
	│   ├── executeTestWorkflow
	│   └── ...
	└── ...


---

Test Setup & Configuration

vitest.config.ts

	import { defineConfig } from "vitest/config";
	
	export default defineConfig({
	  test: {
	    globals: true,
	    environment: "happy-dom",
	    include: ["src/**/*.test.ts"],
	    coverage: {
	      provider: "v8",
	      reporter: ["text", "json", "html", "lcov"],
	      all: true,
	      lines: 90,
	      functions: 90,
	      branches: 90,
	      statements: 90,
	      exclude: [
	        "node_modules/",
	        "src/__tests__/",
	        "src/testing.ts",
	      ],
	    },
	  },
	});

src/__tests__/setup.ts

	import { beforeEach, afterEach } from "vitest";
	
	beforeEach(() => {
	  // Reset mock stores
	  stateStore.clear();
	  auditStore.clear();
	  uuidCounter = 0;
	});
	
	afterEach(() => {
	  // Cleanup
	  stateStore.clear();
	  auditStore.clear();
	});
	
	// Extend Vitest matchers for Effect
	expect.extend({
	  async toSucceedWith(received: Effect.Effect<any, any>, expected: any) {
	    const result = await Effect.runPromise(Effect.either(received));
	    return {
	      pass: result._tag === "Right" && result.right === expected,
	      message: () =>
	        `Expected effect to succeed with ${expected}, but got ${JSON.stringify(result)}`,
	    };
	  },
	
	  async toFailWith(received: Effect.Effect<any, any>, expectedError: string) {
	    const result = await Effect.runPromise(Effect.either(received));
	    return {
	      pass:
	        result._tag === "Left" &&
	        result.left.constructor.name === expectedError,
	      message: () =>
	        `Expected effect to fail with ${expectedError}, but got ${JSON.stringify(result)}`,
	    };
	  },
	});


---

Running Tests

	# Run all tests in watch mode
	bun test
	
	# Run tests once
	bun test:run
	
	# Run tests with UI
	bun test:ui
	
	# Run tests with coverage
	bun test:coverage
	
	# Run specific test suite
	bun test src/__tests__/unit/spec.test.ts
	
	# Run golden tests only
	bun test golden.test.ts
	
	# Run integration tests only
	bun test src/__tests__/integration/


---

Test Patterns & Best Practices

1. Always Use Effect.either for Error Cases

	const result = await Effect.runPromise(
	  Effect.either(actor.execute(command))
	);
	
	if (result._tag === "Left") {
	  expect(result.left).toBeInstanceOf(GuardFailedError);
	}

2. Use Effect.gen for Sequential Test Logic

	const effect = Effect.gen(function* () {
	  const actor = yield* ActorService;
	  const result1 = yield* actor.execute(command1);
	  const result2 = yield* actor.execute(command2);
	  return { result1, result2 };
	}).pipe(Effect.provideLayer(ActorService.layer));

3. Use JSONC Fixtures for Golden Tests

	{
	  "test_name": {
	    "__metadata": {
	      "description": "What this tests",
	      "shouldSucceed": true
	    },
	    "steps": [
	      { "event": "PLAN", "expectedState": "Planned" }
	    ]
	  }
	}

4. Name Tests Descriptively

	it("should execute full workflow: Idea → Planned → Draft → Review → Published", () => {});
	it("should fail guard when word count too low", () => {});
	it("should recover from transient storage error with retry", () => {});

5. Test Both Happy Path and Error Cases

	describe("actor.execute", () => {
	  it("should succeed with valid command", () => {});
	  it("should fail with guard failure", () => {});
	  it("should fail with invalid transition", () => {});
	  it("should fail with storage error", () => {});
	});

6. Use Mock Providers Consistently

	const effect = operation.pipe(
	  Effect.provideLayer(ActorService.layer),
	  Effect.provideLayer(mockStorageProvider.layer),
	  Effect.provideLayer(mockComputeProvider.layer),
	  Effect.provideLayer(mockPolicyProvider.layer)
	);

7. Test Edge Cases and Boundaries

	describe("Guard evaluation", () => {
	  it("should pass with minimum valid word count", () => {});
	  it("should fail with word count below minimum", () => {});
	  it("should fail with zero word count", () => {});
	  it("should pass with very high word count", () => {});
	});

8. Document Fixture Intent

	// Fixture name is descriptive
	"workflow_idea_to_published" // What transitions happen
	"guard_fails_low_word_count"  // What error occurs and why
	"roundtrip_state_persistence" // What is being tested


---

Continuous Integration

.github/workflows/test.yml

	name: Tests
	
	on: [push, pull_request]
	
	jobs:
	  test:
	    runs-on: ubuntu-latest
	    steps:
	      - uses: actions/checkout@v4
	      - uses: oven-sh/setup-bun@v1
	      - run: bun install
	      
	      - name: Lint
	        run: bun run lint
	      
	      - name: Test
	        run: bun run test:run
	      
	      - name: Coverage
	        run: bun run test:coverage
	      
	      - name: Upload Coverage
	        uses: codecov/codecov-action@v4
	        with:
	          files: ./coverage/coverage-final.json
	          flags: unittests
	          fail_ci_if_error: false
	
	  build:
	    runs-on: ubuntu-latest
	    steps:
	      - uses: actions/checkout@v4
	      - uses: oven-sh/setup-bun@v1
	      - run: bun install
	      - run: bun run build


---

Test Maintenance

- Review golden fixtures quarterly: Ensure they reflect current patterns and edge cases

- Update mocks when APIs change: Keep mock providers in sync with real implementations

- Monitor coverage trends: Maintain ≥90% coverage as code evolves

- Add tests for all bugs fixed: Regression prevention

- Refactor tests for clarity: Remove duplication, improve readability

- Document patterns as you discover them: Update this guide


---

Testing New Actor Types

Checklist for Adding a Custom Actor

1. Define the spec (TypeScript object with states, guards, actions)

2. Create unit tests for guards and actions

3. Create integration tests for full workflows (happy path + errors)

4. Create golden fixture (JSONC with test cases)

5. Write golden tests (metadata-driven test runner)

6. Document errors (what can go wrong, how to recover)

7. Create wrapper class (optional, for non-Effect consumers)

Example: Creating HiringPipelineActor Tests

	// 1. Define spec
	const hiringPipelineSpec = createActorSpec({
	  id: "hiring-pipeline",
	  schema: CandidateSchema,
	  initial: "Applied",
	  states: {
	    Applied: { on: { SCHEDULE_INTERVIEW: "Interviewing" } },
	    Interviewing: { on: { PASS: "Offered", FAIL: "Rejected" } },
	    Offered: { on: { ACCEPT: "Hired", DECLINE: "Rejected" } },
	    Hired: {},
	    Rejected: {},
	  },
	  guards: {
	    hasInterviewDate: (ctx) => ctx.interviewDate !== undefined,
	  },
	  actions: {
	    recordInterviewDate: (ctx) => ({
	      ...ctx,
	      interviewDate: new Date(),
	    }),
	  },
	});
	
	// 2. Unit tests for guards/actions
	describe("Hiring Pipeline - Guards", () => {
	  it("should pass hasInterviewDate when date set", () => {
	    const guard = hiringPipelineSpec.guards.hasInterviewDate;
	    expect(guard({ interviewDate: new Date() })).toBe(true);
	    expect(guard({ interviewDate: undefined })).toBe(false);
	  });
	});
	
	// 3. Integration tests
	describe("Hiring Pipeline - Workflows", () => {
	  it("should flow Applied → Interviewing → Offered → Hired", () => {
	    // Full workflow test
	  });
	});
	
	// 4. Golden fixture
	const fixture = {
	  "hiring_full_workflow": {
	    "__metadata": {
	      "description": "Candidate from Applied to Hired",
	      "steps": [
	        {
	          "event": "SCHEDULE_INTERVIEW",
	          "data": { "interviewDate": "2025-11-01" },
	          "expectedState": "Interviewing",
	        },
	        { "event": "PASS", "expectedState": "Offered" },
	        { "event": "ACCEPT", "expectedState": "Hired" },
	      ],
	    },
	  },
	};
	
	// 5. Golden tests
	describe("Golden Fixtures - Hiring Pipeline", () => {
	  // Metadata-driven test runner
	});
	
	// 6. Wrapper class
	export class HiringPipelineActor extends ActorWrapper {
	  constructor(service: ActorService) {
	    super(service, "hiring-pipeline");
	  }
	}


---

Performance Benchmarking (Optional)

	// src/__tests__/performance.test.ts
	import { bench, describe } from "vitest";
	import { Effect } from "effect";
	import { ActorService } from "../actor/service";
	
	describe("Performance Benchmarks", () => {
	  bench("state transition latency (<1ms in-memory)", async () => {
	    await Effect.runPromise(
	      ActorService.execute({
	        actorType: "content-production",
	        actorId: "perf-1",
	        event: "PLAN",
	        data: { publishTargetDate: new Date() },
	      })
	    );
	  });
	
	  bench("spec validation latency (<10ms)", async () => {
	    await Effect.runPromise(validateSpec(contentProductionSpec));
	  });
	
	  bench("audit query latency (<100ms for 1000 entries)", async () => {
	    await Effect.runPromise(auditLog.query("content-production", "perf-1"));
	  });
	});


---

Conclusion


This test strategy ensures:


1. Comprehensive coverage (≥90%) across all layers

2. Deterministic, reproducible tests (no real I/O, mocked providers)

3. Clear patterns agents can follow consistently

4. Golden fixtures as living documentation

5. Error recovery validation with practical patterns

6. Performance oversight with benchmarks

Tests serve as both safety nets and executable specifications of intended behavior.
Question: In ARCHITECTURE.md, the GuardFn type is (context: any) => boolean.

Should this be (context: Schema.Schema.Type<ActorSpec['schema']>) => boolean for type safety?

Document: ARCHITECTURE.md - Specification & Validation Layer

Why it matters: Type safety in guards; prevents runtime type errors

My assumption: Guards receive the full context object, not a schema type

Suggested answer: GuardFn should be generic over the schema type, like:

	type GuardFn<T = any> = (context: T) => boolean;


	## Submission
	
	Please:
	
	1. **Read all five documents carefully** (1-2 hours total)
	2. **List all clarifying questions** in the format above
	3. **Group questions by topic** (API, Errors, Testing, etc.)
	4. **Flag any blockers** that would prevent you from starting Phase 1
	
	If you have **0 questions**, explicitly state: "I have reviewed all documents and have no clarifying questions. I'm ready to begin Phase 1 implementation."
	
	If you have **questions**, I (Paul) will answer them before Phase 1 begins.
	
	## Important Notes
	
	- **Don't hold back**: Ask even "obvious" questions. Better to clarify now than implement wrongly.
	- **Be specific**: General "this is confusing" is less helpful than concrete questions.
	- **Propose solutions**: If you spot a gap, suggest how to fill it.
	- **Challenge assumptions**: If something seems wrong, say so.
	- **Cross-reference documents**: Point out if one doc contradicts another.
	
	---
	
	## Timeline
	
	- **Document Review**: Today (2-3 hours)
	- **Clarification Q&A**: Today/Tomorrow (async)
	- **Phase 1 Kickoff**: Once questions are answered
	
	Let me know when you've finished your review and are ready to ask questions!


---