import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ThreadService } from "../service.js";
import { sharedRuntime } from "../../../context/atomRuntime.js";

/**
 * Test suite to verify the singleton pattern works end-to-end
 * Confirms that all ThreadService instances share the same state
 * regardless of which runtime they're created in
 */
describe("ThreadService Singleton Pattern", () => {
	describe("State Sharing Across Runtimes", () => {
		it("should share state between sharedRuntime and ThreadService.Default()", async () => {
			// Clear any existing state
			const clearProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({ type: "CLEAR_MESSAGES" });
			});
			await sharedRuntime.runPromise(clearProgram);

			// Add a message via sharedRuntime
			const addViaSharedRuntime = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "Hello from sharedRuntime" },
				});
			});
			await sharedRuntime.runPromise(addViaSharedRuntime);

			// Read state via ThreadService.Default() (different runtime)
			const readViaDefault = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const state = await Effect.runPromise(
				Effect.provide(readViaDefault, ThreadService.Default()),
			);

			// Verify the message added via sharedRuntime is visible via Default()
			expect(state.messages.length).toBe(1);
			expect(state.messages[0]?.content).toBe("Hello from sharedRuntime");
		});

		it("should share state between multiple sharedRuntime calls", async () => {
			// Clear any existing state
			const clearProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({ type: "CLEAR_MESSAGES" });
			});
			await sharedRuntime.runPromise(clearProgram);

			// Add first message
			const addFirst = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "First message" },
				});
			});
			await sharedRuntime.runPromise(addFirst);

			// Add second message (should see first message)
			const addSecond = Effect.gen(function* () {
				const service = yield* ThreadService;
				const state = yield* service.getState();
				// Verify we can see the first message
				expect(state.messages.length).toBe(1);
				expect(state.messages[0]?.content).toBe("First message");

				// Add second message
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "assistant", content: "Second message" },
				});
			});
			await sharedRuntime.runPromise(addSecond);

			// Verify both messages are present
			const verifyProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const finalState = await sharedRuntime.runPromise(verifyProgram);

			expect(finalState.messages.length).toBe(2);
			expect(finalState.messages[0]?.content).toBe("First message");
			expect(finalState.messages[1]?.content).toBe("Second message");
		});

		it("should share state between ThreadService.Default() instances", async () => {
			// Clear any existing state
			const clearProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({ type: "CLEAR_MESSAGES" });
			});
			await Effect.runPromise(
				Effect.provide(clearProgram, ThreadService.Default()),
			);

			// Add message via first instance
			const addViaFirst = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "From first instance" },
				});
			});
			await Effect.runPromise(
				Effect.provide(addViaFirst, ThreadService.Default()),
			);

			// Read via second instance (different Effect.runPromise call)
			const readViaSecond = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const state = await Effect.runPromise(
				Effect.provide(readViaSecond, ThreadService.Default()),
			);

			// Verify state is shared
			expect(state.messages.length).toBe(1);
			expect(state.messages[0]?.content).toBe("From first instance");
		});

		it("should share state across all three runtime types", async () => {
			// Clear any existing state
			const clearProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({ type: "CLEAR_MESSAGES" });
			});
			await sharedRuntime.runPromise(clearProgram);

			// Add via sharedRuntime
			const addViaShared = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "Via sharedRuntime" },
				});
			});
			await sharedRuntime.runPromise(addViaShared);

			// Read via ThreadService.Default()
			const readViaDefault = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const state1 = await Effect.runPromise(
				Effect.provide(readViaDefault, ThreadService.Default()),
			);

			expect(state1.messages.length).toBe(1);
			expect(state1.messages[0]?.content).toBe("Via sharedRuntime");

			// Add via ThreadService.Default()
			const addViaDefault = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "assistant", content: "Via Default()" },
				});
			});
			await Effect.runPromise(
				Effect.provide(addViaDefault, ThreadService.Default()),
			);

			// Read via sharedRuntime
			const readViaShared = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const state2 = await sharedRuntime.runPromise(readViaShared);

			expect(state2.messages.length).toBe(2);
			expect(state2.messages[0]?.content).toBe("Via sharedRuntime");
			expect(state2.messages[1]?.content).toBe("Via Default()");
		});
	});

	describe("Concurrent Mutations", () => {
		it("should handle concurrent mutations correctly", async () => {
			// Clear any existing state
			const clearProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({ type: "CLEAR_MESSAGES" });
			});
			await sharedRuntime.runPromise(clearProgram);

			// Add messages concurrently
			const add1 = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "Message 1" },
				});
			});
			const add2 = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "Message 2" },
				});
			});
			const add3 = Effect.gen(function* () {
				const service = yield* ThreadService;
				yield* service.send({
					type: "ADD_MESSAGE",
					payload: { role: "user", content: "Message 3" },
				});
			});

			// Run concurrently
			await Promise.all([
				sharedRuntime.runPromise(add1),
				sharedRuntime.runPromise(add2),
				sharedRuntime.runPromise(add3),
			]);

			// Verify all messages are present
			const verifyProgram = Effect.gen(function* () {
				const service = yield* ThreadService;
				return yield* service.getState();
			});
			const finalState = await sharedRuntime.runPromise(verifyProgram);

			expect(finalState.messages.length).toBe(3);
			// Messages should be in order (Ref operations are atomic)
			const contents = finalState.messages.map((m) => m.content);
			expect(contents).toContain("Message 1");
			expect(contents).toContain("Message 2");
			expect(contents).toContain("Message 3");
		});
	});
});
