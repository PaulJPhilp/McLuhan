import { Cause, Effect, Exit, Schema } from "effect";
import { describe, expect, test } from "vitest";
import type { ActorState } from "../actor/types.js";
import {
	ActionNotFoundError,
	GuardFailedError,
	GuardNotFoundError,
	InvalidStateError,
	TransitionNotAllowedError,
	ValidationError,
} from "../errors.js";
import type { ActorSpec } from "../spec/types.js";
import { executeCommand } from "./transition.js";

/**
 * Test suite for executeCommand
 *
 * Coverage:
 * - Happy path (successful transition)
 * - Guard passing/failing
 * - Action execution order (exit → transition → entry)
 * - Schema validation
 * - Error cases (invalid state, missing guards/actions, etc.)
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

// Test schema and spec
const TestSchema = Schema.Struct({
	count: Schema.Number,
	message: Schema.optional(Schema.String),
});

type TestContext = typeof TestSchema.Type;

const createTestSpec = (): ActorSpec<TestContext> => ({
	id: "test-spec",
	schema: TestSchema,
	initial: "idle",
	states: {
		idle: {
			on: {
				START: "active",
				START_WITH_GUARD: {
					target: "active",
					guard: "canStart",
				},
				START_WITH_ACTION: {
					target: "active",
					action: "increment",
				},
			},
		},
		active: {
			exit: "onExit",
			on: {
				COMPLETE: {
					target: "done",
					action: "increment",
				},
			},
		},
		done: {
			entry: "onEntry",
		},
	},
	guards: {
		canStart: (ctx: TestContext) => ctx.count > 0,
	},
	actions: {
		increment: (ctx: TestContext): TestContext => ({
			...ctx,
			count: ctx.count + 1,
		}),
		onExit: (ctx: TestContext): TestContext => ({
			...ctx,
			message: "exited",
		}),
		onEntry: (ctx: TestContext): TestContext => ({
			...ctx,
			message: "entered",
		}),
	},
});

describe("executeCommand", () => {
	describe("Happy path", () => {
		test("should execute simple transition without guard or action", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, { event: "START" }),
			);

			expect(result.from).toBe("idle");
			expect(result.to).toBe("active");
			expect(result.event).toBe("START");
			expect(result.newContext).toEqual({ count: 0 });
		});

		test("should merge command.data into context", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, {
					event: "START",
					data: { message: "hello" },
				}),
			);

			expect(result.newContext).toEqual({ count: 0, message: "hello" });
		});

		test("should execute transition action", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 5 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, { event: "START_WITH_ACTION" }),
			);

			expect(result.newContext).toEqual({ count: 6 });
		});

		test("should execute exit → transition → entry actions in order", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "active",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, { event: "COMPLETE" }),
			);

			// Should have:
			// 1. Exit action: message = "exited"
			// 2. Transition action: count = 1
			// 3. Entry action: message = "entered"
			expect(result.newContext).toEqual({ count: 1, message: "entered" });
		});
	});

	describe("Guards", () => {
		test("should allow transition when guard passes", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 5 }, // Guard requires count > 0
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, { event: "START_WITH_GUARD" }),
			);

			expect(result.to).toBe("active");
		});

		test("should fail when guard returns false", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 }, // Guard requires count > 0
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, {
				event: "START_WITH_GUARD",
			});

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(GuardFailedError);
		});

		test("should fail when guard not found", async () => {
			const spec: ActorSpec<TestContext> = {
				...createTestSpec(),
				states: {
					idle: {
						on: {
							START: {
								target: "active",
								guard: "nonExistentGuard",
							},
						},
					},
					active: {},
				},
			};

			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, { event: "START" });

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(GuardNotFoundError);
		});
	});

	describe("Actions", () => {
		test("should fail when action not found", async () => {
			const spec: ActorSpec<TestContext> = {
				...createTestSpec(),
				states: {
					idle: {
						on: {
							START: {
								target: "active",
								action: "nonExistentAction",
							},
						},
					},
					active: {},
				},
			};

			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, { event: "START" });

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(ActionNotFoundError);
		});
	});

	describe("Schema validation", () => {
		test("should pass when context is valid", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await Effect.runPromise(
				executeCommand(spec, state, { event: "START" }),
			);

			expect(result.newContext).toMatchObject({ count: expect.any(Number) });
		});

		test("should fail when action produces invalid context", async () => {
			const spec: ActorSpec<TestContext> = {
				...createTestSpec(),
				actions: {
					...createTestSpec().actions,
					increment: (_ctx: TestContext): any => ({
						count: "invalid", // Should be number
					}),
				},
			};

			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, {
				event: "START_WITH_ACTION",
			});

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(ValidationError);
		});
	});

	describe("Error cases", () => {
		test("should fail when current state not in spec", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "nonExistentState",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, { event: "START" });

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(InvalidStateError);
		});

		test("should fail when event not allowed from current state", async () => {
			const spec = createTestSpec();
			const state: ActorState = {
				id: "test-1",
				actorType: "test",
				state: "idle",
				context: { count: 0 },
				version: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const program = executeCommand(spec, state, { event: "INVALID_EVENT" });

			const exit = await Effect.runPromiseExit(program);
			const error = getError(exit);
			expect(error).toBeInstanceOf(TransitionNotAllowedError);
		});
	});
});
