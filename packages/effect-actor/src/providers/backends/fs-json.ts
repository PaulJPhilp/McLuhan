import { Effect, Layer } from "effect";
import { StorageProvider, type StorageProviderApi } from "../storage.js";
import type { ActorState, QueryFilter } from "../../actor/types.js";
import type { AuditEntry } from "../../audit.js";
import { StorageError } from "../../errors.js";
import * as path from "node:path";

/**
 * File format for persisted actor data
 */
type ActorFile = {
	state: ActorState;
	audit: AuditEntry[];
	savedAt: string;
};

/**
 * Helper functions for file operations
 */
const getFilePath = (basePath: string, actorType: string, actorId: string): string => {
	return path.join(basePath, actorType, `${actorId}.jsonc`);
};

const loadFile = (filePath: string): Effect.Effect<ActorFile, StorageError> => {
	return Effect.gen(function* () {
		const file = Bun.file(filePath);
		const exists = yield* Effect.promise(() => file.exists());

		if (!exists) {
			return yield* Effect.fail(
				new StorageError({
					backend: "fs-json",
					operation: "load",
					reason: `Actor not found: ${filePath}`,
				}),
			);
		}

		const content = yield* Effect.promise(() => file.text()).pipe(
			Effect.mapError(
				(e) =>
					new StorageError({
						backend: "fs-json",
						operation: "load",
						reason: `Failed to read file: ${e}`,
					}),
			),
		);

		try {
			const data = JSON.parse(content) as ActorFile;
			// Reconstruct Date objects from ISO strings
			data.state.createdAt = new Date(data.state.createdAt);
			data.state.updatedAt = new Date(data.state.updatedAt);
			data.audit = data.audit.map((entry) => ({
				...entry,
				timestamp: new Date(entry.timestamp),
			}));
			return data;
		} catch (e) {
			return yield* Effect.fail(
				new StorageError({
					backend: "fs-json",
					operation: "load",
					reason: `Failed to parse JSON: ${e}`,
				}),
			);
		}
	});
};

/**
 * Create FsJsonStorageProvider implementation
 */
const makeFsJsonStorageProvider = (
	basePath: string,
): StorageProviderApi => {
	const save = (
		actorType: string,
		actorId: string,
		state: ActorState,
		audit: AuditEntry,
	): Effect.Effect<void, StorageError> =>
		Effect.gen(function* () {
			const filePath = getFilePath(basePath, actorType, actorId);
			const dirPath = path.dirname(filePath);

			// Ensure directory exists using mkdir
			yield* Effect.promise(() =>
				import("node:fs/promises").then((fs) =>
					fs.mkdir(dirPath, { recursive: true }),
				),
			).pipe(
				Effect.mapError(
					(e) =>
						new StorageError({
							backend: "fs-json",
							operation: "save",
							reason: `Failed to create directory: ${e}`,
						}),
				),
			);

			// Load existing data to append audit
			const existingData = yield* loadFile(filePath).pipe(
				Effect.catchAll(() =>
					Effect.succeed({
						state,
						audit: [],
						savedAt: new Date().toISOString(),
					} as ActorFile),
				),
			);

			// Append new audit entry
			const updatedData: ActorFile = {
				state,
				audit: [...existingData.audit, audit],
				savedAt: new Date().toISOString(),
			};

			// Write atomically using Bun.write
			yield* Effect.promise(() =>
				Bun.write(filePath, JSON.stringify(updatedData, null, 2)),
			).pipe(
				Effect.mapError(
					(e) =>
						new StorageError({
							backend: "fs-json",
							operation: "save",
							reason: `Failed to write file: ${e}`,
						}),
				),
			);
		});

	const load = (
		actorType: string,
		actorId: string,
	): Effect.Effect<ActorState, StorageError> =>
		Effect.gen(function* () {
			const filePath = getFilePath(basePath, actorType, actorId);
			const data = yield* loadFile(filePath);
			return data.state;
		});

	const query = (
		actorType: string,
		filter?: QueryFilter,
	): Effect.Effect<ActorState[], StorageError> =>
		Effect.gen(function* () {
			const dirPath = path.join(basePath, actorType);

			// List all files in directory
			const files = yield* Effect.promise(() =>
				Bun.file(dirPath)
					.exists()
					.then((exists) => {
						if (!exists) return [];
						return Array.from(
							new Bun.Glob("*.jsonc").scanSync({ cwd: dirPath }),
						);
					}),
			).pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

			// Load all actor states
			const states: ActorState[] = [];
			for (const file of files) {
				const actorId = path.basename(file, ".jsonc");
				const data = yield* loadFile(getFilePath(basePath, actorType, actorId)).pipe(
					Effect.catchAll(() => Effect.succeed(null)),
				);

				if (data) {
					states.push(data.state);
				}
			}

			// Apply filters
			let filtered = states;

			if (filter?.status) {
				filtered = filtered.filter((s) => s.state === filter.status);
			}

			if (filter?.createdAfter) {
				filtered = filtered.filter(
					(s) => new Date(s.createdAt) >= filter.createdAfter!,
				);
			}

			if (filter?.createdBefore) {
				filtered = filtered.filter(
					(s) => new Date(s.createdAt) <= filter.createdBefore!,
				);
			}

			if (filter?.updatedAfter) {
				filtered = filtered.filter(
					(s) => new Date(s.updatedAt) >= filter.updatedAfter!,
				);
			}

			if (filter?.updatedBefore) {
				filtered = filtered.filter(
					(s) => new Date(s.updatedAt) <= filter.updatedBefore!,
				);
			}

			// Apply pagination
			const offset = filter?.offset ?? 0;
			const limit = filter?.limit ?? filtered.length;
			return filtered.slice(offset, offset + limit);
		});

	const getHistory = (
		actorType: string,
		actorId: string,
		limit?: number,
		offset?: number,
	): Effect.Effect<AuditEntry[], StorageError> =>
		Effect.gen(function* () {
			const filePath = getFilePath(basePath, actorType, actorId);
			const data = yield* loadFile(filePath);

			// Sort by timestamp descending (newest first)
			const sorted = [...data.audit].sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);

			// Apply pagination
			const start = offset ?? 0;
			const end = limit ? start + limit : sorted.length;
			return sorted.slice(start, end);
		});

	return {
		save,
		load,
		query,
		getHistory,
	};
};

/**
 * FsJsonStorageProvider - file system based JSON storage backend
 *
 * File structure: {basePath}/{actorType}/{actorId}.jsonc
 *
 * Each file contains:
 * - Current actor state
 * - Complete audit trail
 * - Timestamp of last save
 */
export const FsJsonStorageProvider = {
	/**
	 * Create a Layer for this storage provider
	 */
	layer: (basePath: string) =>
		Layer.succeed(
			StorageProvider,
			StorageProvider.make(makeFsJsonStorageProvider(basePath)),
		),
};
