import { Effect, Layer } from "effect";
import type { ActorState, QueryFilter } from "../actor/types.js";
import type { AuditEntry } from "../audit.js";
import { StorageError } from "../errors.js";
import { ComputeProvider } from "../providers/compute.js";
import { PolicyProvider } from "../providers/policy.js";
import { StorageProvider, type StorageProviderApi } from "../providers/storage.js";

/**
 * MockStorageProvider - in-memory storage for testing
 */
export const createMockStorage = (): StorageProviderApi => {
	const actors = new Map<string, ActorState>();
	const audits = new Map<string, AuditEntry[]>();

	const getKey = (actorType: string, actorId: string) => `${actorType}:${actorId}`;

	const save = (
		actorType: string,
		actorId: string,
		state: ActorState,
		audit: AuditEntry,
	): Effect.Effect<void, StorageError> =>
		Effect.sync(() => {
			const key = getKey(actorType, actorId);
			actors.set(key, state);
			const existing = audits.get(key) ?? [];
			audits.set(key, [audit, ...existing]);
		});

	const load = (
		actorType: string,
		actorId: string,
	): Effect.Effect<ActorState, StorageError> =>
		Effect.gen(function* () {
			const key = getKey(actorType, actorId);
			const state = actors.get(key);
			if (!state) {
				return yield* Effect.fail(
					new StorageError({
						backend: "mock",
						operation: "load",
						reason: `Actor not found: ${key}`,
					}),
				);
			}
			return state;
		});

	const query = (
		actorType: string,
		filter?: QueryFilter,
	): Effect.Effect<ActorState[], StorageError> =>
		Effect.sync(() => {
			let results: ActorState[] = [];
			for (const [key, state] of actors.entries()) {
				if (key.startsWith(`${actorType}:`)) {
					results.push(state);
				}
			}
			return results;
		});

	const getHistory = (
		actorType: string,
		actorId: string,
		limit?: number,
		offset?: number,
	): Effect.Effect<AuditEntry[], StorageError> =>
		Effect.gen(function* () {
			const key = getKey(actorType, actorId);
			const history = audits.get(key) ?? [];
			return history.slice(offset ?? 0, (offset ?? 0) + (limit ?? 100));
		});

	return {
		save,
		load,
		query,
		getHistory,
	};
};

/**
 * MockStorageProvider Layer
 */
export const MockStorageLayer = Layer.succeed(
	StorageProvider,
	StorageProvider.make(createMockStorage()),
);

/**
 * MockComputeProvider Layer - provides deterministic compute for testing
 */
export const MockComputeLayer = Layer.effect(
	ComputeProvider,
	Effect.succeed({
		_tag: "effect-actor/ComputeProvider" as const,
		now: () => Effect.sync(() => new Date()),
		uuid: () => Effect.sync(() => "mock-uuid-1234-5678-9abc-def012345678" as `${string}-${string}-${string}-${string}-${string}`),
		estimateReadingTime: (text: string) =>
			Effect.sync(() => Math.ceil(text.split(/\s+/).length / 200)),
	}),
);

/**
 * MockPolicyProvider Layer - uses default (allows all)
 */
export const MockPolicyLayer = PolicyProvider.Default;

/**
 * Combined mock layers for testing
 */
export const MockLayers = MockComputeLayer.pipe(
	Layer.provideMerge(MockStorageLayer),
	Layer.provideMerge(MockPolicyLayer),
);
