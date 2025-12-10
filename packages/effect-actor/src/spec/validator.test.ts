import { Cause, Effect, Exit, Schema } from "effect";
import { describe, expect, test } from "vitest";
import {
	ActionNotFoundError,
	GuardNotFoundError,
	InvalidStateError,
	SpecError,
} from "../errors.js";
import type { ActorSpec } from "./types.js";
import { validateSpec } from "./validator.js";

/**
 * Test suite for validateSpec
 *
 * Coverage:
 * - Valid specs (happy path)
 * - Initial state validation
 * - Transition target validation
 * - Guard reference validation
 * - Action reference validation (transition, entry, exit)
 */

// Helper to extract error from Exit
const getError = <E>(exit: Exit.Exit<unknown, E>): E | null => {
	if (Exit.isFailure(exit)) {
		const failureOption = Cause.failureOption(exit.cause);
		if (failureOption._tag === "Some") {
			return failureOption.value;
		}
	}
	return null;
};

// Test schema
const TestSchema = Schema.Struct({
	value: Schema.Number,
});

type TestContext = typeof TestSchema.Type;

describe("validateSpec", () => {
	describe("Valid specs", () => {
		test("should pass for minimal valid spec", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {},
				},
				guards: {},
				actions: {},
			};

			const result = await Effect.runPromise(validateSpec(spec));
			expect(result).toBeUndefined();
		});

		test("should pass for spec with simple transitions", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: "active",
						},
					},
					active: {
						on: {
							STOP: "idle",
						},
					},
				},
				guards: {},
				actions: {},
			};

			const result = await Effect.runPromise(validateSpec(spec));
			expect(result).toBeUndefined();
		});

		test("should pass for spec with guards and actions", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "active",
								guard: "canStart",
								action: "initialize",
							},
						},
					},
					active: {
						entry: "onEntry",
						exit: "onExit",
						on: {
							STOP: "idle",
						},
					},
				},
				guards: {
					canStart: (ctx: TestContext) => ctx.value > 0,
				},
				actions: {
					initialize: (ctx: TestContext) => ctx,
					onEntry: (ctx: TestContext) => ctx,
					onExit: (ctx: TestContext) => ctx,
				},
			};

			const result = await Effect.runPromise(validateSpec(spec));
			expect(result).toBeUndefined();
		});
	});

	describe("Initial state validation", () => {
		test("should fail when initial state does not exist", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "nonexistent",
				states: {
					idle: {},
				},
				guards: {},
				actions: {},
			};

			const exit = await Effect.runPromiseExit(validateSpec(spec));
			const error = getError(exit);
			expect(error).toBeInstanceOf(InvalidStateError);
			expect((error as InvalidStateError).state).toBe('nonexistent');
		});
	});

	describe("Transition target validation", () => {
		test("should fail when transition target does not exist (string form)", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: "nonexistent",
						},
					},
					active: {},
				},
				guards: {},
				actions: {},
			};

			const exit = await Effect.runPromiseExit(validateSpec(spec));
			const error = getError(exit);
			expect(error).toBeInstanceOf(SpecError);
			expect((error as SpecError).reason).toContain('Transition target');
		});

		test("should fail when transition target does not exist (object form)", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "nonexistent",
							},
						},
					},
				},
				guards: {},
				actions: {},
			};

			const exit = await Effect.runPromiseExit(validateSpec(spec));
			const error = getError(exit);
			expect(error).toBeInstanceOf(SpecError);
			expect((error as SpecError).reason).toContain('Transition target');
		});
	});

	describe("Guard reference validation", () => {
		test("should fail when referenced guard does not exist", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "active",
								guard: "nonexistentGuard",
							},
						},
					},
					active: {},
				},
				guards: {},
				actions: {},
			};

			const exit = await Effect.runPromiseExit(validateSpec(spec));
			const error = getError(exit);
			expect(error).toBeInstanceOf(GuardNotFoundError);
			expect((error as GuardNotFoundError).guard).toBe('nonexistentGuard');
		});

		test("should pass when guard exists", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "active",
								guard: "canStart",
							},
						},
					},
					active: {},
				},
				guards: {
					canStart: (ctx: TestContext) => ctx.value > 0,
				},
				actions: {},
			};

			const result = await Effect.runPromise(validateSpec(spec));
			expect(result).toBeUndefined();
		});
	});

	describe("Action reference validation", () => {
		describe("Transition actions", () => {
			test("should fail when transition action does not exist", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							on: {
								START: {
									target: "active",
									action: "nonexistentAction",
								},
							},
						},
						active: {},
					},
					guards: {},
					actions: {},
				};

				const exit = await Effect.runPromiseExit(validateSpec(spec));
				const error = getError(exit);
				expect(error).toBeInstanceOf(ActionNotFoundError);
				expect((error as ActionNotFoundError).action).toBe('nonexistentAction');
			});

			test("should pass when transition action exists", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							on: {
								START: {
									target: "active",
									action: "initialize",
								},
							},
						},
						active: {},
					},
					guards: {},
					actions: {
						initialize: (ctx: TestContext) => ctx,
					},
				};

				const result = await Effect.runPromise(validateSpec(spec));
				expect(result).toBeUndefined();
			});
		});

		describe("Entry actions", () => {
			test("should fail when entry action does not exist", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							entry: "nonexistentEntry",
						},
					},
					guards: {},
					actions: {},
				};

				const exit = await Effect.runPromiseExit(validateSpec(spec));
				const error = getError(exit);
				expect(error).toBeInstanceOf(ActionNotFoundError);
				expect((error as ActionNotFoundError).action).toBe('nonexistentEntry');
			});

			test("should pass when entry action exists", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							entry: "onEntry",
						},
					},
					guards: {},
					actions: {
						onEntry: (ctx: TestContext) => ctx,
					},
				};

				const result = await Effect.runPromise(validateSpec(spec));
				expect(result).toBeUndefined();
			});
		});

		describe("Exit actions", () => {
			test("should fail when exit action does not exist", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							exit: "nonexistentExit",
						},
					},
					guards: {},
					actions: {},
				};

				const exit = await Effect.runPromiseExit(validateSpec(spec));
				const error = getError(exit);
				expect(error).toBeInstanceOf(ActionNotFoundError);
				expect((error as ActionNotFoundError).action).toBe('nonexistentExit');
			});

			test("should pass when exit action exists", async () => {
				const spec: ActorSpec<TestContext> = {
					id: "test",
					schema: TestSchema,
					initial: "idle",
					states: {
						idle: {
							exit: "onExit",
						},
					},
					guards: {},
					actions: {
						onExit: (ctx: TestContext) => ctx,
					},
				};

				const result = await Effect.runPromise(validateSpec(spec));
				expect(result).toBeUndefined();
			});
		});
	});

	describe("Complex specs", () => {
		test("should validate all references in a complex spec", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "processing",
								guard: "canStart",
								action: "initialize",
							},
						},
					},
					processing: {
						entry: "onProcessingEntry",
						exit: "onProcessingExit",
						on: {
							COMPLETE: {
								target: "done",
								action: "finalize",
							},
							CANCEL: {
								target: "idle",
								guard: "canCancel",
							},
						},
					},
					done: {
						entry: "onDoneEntry",
					},
				},
				guards: {
					canStart: (ctx: TestContext) => ctx.value > 0,
					canCancel: (ctx: TestContext) => ctx.value < 100,
				},
				actions: {
					initialize: (ctx: TestContext) => ctx,
					finalize: (ctx: TestContext) => ctx,
					onProcessingEntry: (ctx: TestContext) => ctx,
					onProcessingExit: (ctx: TestContext) => ctx,
					onDoneEntry: (ctx: TestContext) => ctx,
				},
			};

			const result = await Effect.runPromise(validateSpec(spec));
			expect(result).toBeUndefined();
		});

		test("should fail on first error found in complex spec", async () => {
			const spec: ActorSpec<TestContext> = {
				id: "test",
				schema: TestSchema,
				initial: "idle",
				states: {
					idle: {
						on: {
							START: {
								target: "processing",
								guard: "nonexistentGuard", // First error
								action: "alsoNonexistent", // Would be second error
							},
						},
					},
					processing: {},
				},
				guards: {},
				actions: {},
			};

			const exit = await Effect.runPromiseExit(validateSpec(spec));
			const error = getError(exit);
			expect(error).toBeInstanceOf(GuardNotFoundError);
			// Should fail on the guard reference (first in order)
			expect((error as GuardNotFoundError).guard).toBe('nonexistentGuard');
		});
	});
});
