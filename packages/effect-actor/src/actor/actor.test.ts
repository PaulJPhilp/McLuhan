import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { Actor } from "./actor.js";

describe("Actor.make", () => {
    test("should create an actor that can receive messages", async () => {
        const program = Effect.gen(function* () {
            const actor = yield* Actor.make({
                initialState: 0,
                receive: (state: number, message: "increment" | "decrement") =>
                    Effect.succeed(
                        message === "increment" ? state + 1 : state - 1
                    ),
            });

            // Send increment message
            yield* actor.send("increment");

            // Send decrement message
            yield* actor.send("decrement");

            // Send increment again
            yield* actor.send("increment");

            return actor;
        });

        const result = await Effect.runPromise(program as any) as any;
        expect(result).toBeDefined();
        expect(result.send).toBeDefined();
    });

    test("should handle effects in receive function", async () => {
        const program = Effect.gen(function* () {
            let log: string[] = [];

            const actor = yield* Actor.make({
                initialState: "idle",
                receive: (state: string, message: "start" | "stop") =>
                    Effect.gen(function* () {
                        log.push(`Received ${message} in state ${state}`);
                        if (message === "start" && state === "idle") {
                            return "running";
                        }
                        if (message === "stop" && state === "running") {
                            return "stopped";
                        }
                        return state;
                    }),
            });

            // Start the actor
            yield* actor.send("start");

            // Try to start again (should stay running)
            yield* actor.send("start");

            // Stop the actor
            yield* actor.send("stop");

            return log;
        });

        const log = await Effect.runPromise(program as any);
        expect(log).toEqual([
            "Received start in state idle",
            "Received start in state running",
            "Received stop in state running",
        ]);
    });
});