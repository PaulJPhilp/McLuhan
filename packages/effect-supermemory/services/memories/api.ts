/**
 * Memories Service API
 *
 * @since 1.0.0
 * @module MemoriesApi
 */

import type * as Effect from "effect/Effect";
import type { SupermemoryError } from "@/Errors.js";
import type {
  Memory,
  MemoryAddParams,
  MemoryAddResponse,
  MemoryBatchAddParams,
  MemoryBatchAddResponse,
  MemoryDeleteBulkParams,
  MemoryDeleteBulkResponse,
  MemoryForgetParams,
  MemoryForgetResponse,
  MemoryListParams,
  MemoryListProcessingResponse,
  MemoryListResponse,
  MemoryUpdateMemoryParams,
  MemoryUpdateMemoryResponse,
  MemoryUpdateParams,
  MemoryUpdateResponse,
  MemoryUploadFileParams,
  MemoryUploadFileResponse,
} from "./types.js";

/**
 * API interface for the Memories service.
 *
 * Provides methods for managing memories (documents) in Supermemory.
 * Based on the official Supermemory SDK v4.0.0.
 *
 * @since 1.0.0
 */
export type MemoriesServiceApi = {
  /**
   * Add a new memory/document with any content type (text, URL, etc.).
   *
   * @param params - The memory content and options
   * @returns Effect with the created memory ID and status
   *
   * @example
   * ```typescript
   * const result = yield* MemoriesService.add({
   *   content: "Important information to remember",
   *   containerTag: "user_123",
   *   metadata: { category: "notes" }
   * });
   * console.log(result.id); // "mem_abc123"
   * ```
   */
  readonly add: (
    params: MemoryAddParams
  ) => Effect.Effect<MemoryAddResponse, SupermemoryError>;

  /**
   * Add multiple documents in a single request.
   *
   * @since 4.0.0
   */
  readonly batchAdd: (
    params: MemoryBatchAddParams
  ) => Effect.Effect<MemoryBatchAddResponse, SupermemoryError>;

  /**
   * Get a memory/document by ID.
   *
   * @param id - The memory ID or customId
   * @returns Effect with the full memory object
   *
   * @example
   * ```typescript
   * const memory = yield* MemoriesService.get("mem_abc123");
   * console.log(memory.content);
   * console.log(memory.status); // "done"
   * ```
   */
  readonly get: (id: string) => Effect.Effect<Memory, SupermemoryError>;

  /**
   * List memories with pagination and filtering.
   *
   * @param params - Optional list parameters (pagination, filters, etc.)
   * @returns Effect with paginated list of memories
   *
   * @example
   * ```typescript
   * const result = yield* MemoriesService.list({
   *   containerTags: ["user_123"],
   *   limit: 10,
   *   page: 1,
   *   sort: "createdAt",
   *   order: "desc"
   * });
   * console.log(result.memories.length);
   * console.log(result.pagination.totalItems);
   * ```
   */
  readonly list: (
    params?: MemoryListParams
  ) => Effect.Effect<MemoryListResponse, SupermemoryError>;

  /**
   * Get documents that are currently being processed.
   *
   * @since 4.0.0
   */
  readonly listProcessing: () => Effect.Effect<
    MemoryListProcessingResponse,
    SupermemoryError
  >;

  /**
   * Update an existing memory/document.
   *
   * @param id - The memory ID to update
   * @param params - The fields to update
   * @returns Effect with the updated memory ID and status
   *
   * @example
   * ```typescript
   * const result = yield* MemoriesService.update("mem_abc123", {
   *   content: "Updated content",
   *   metadata: { version: 2 }
   * });
   * ```
   */
  readonly update: (
    id: string,
    params?: MemoryUpdateParams
  ) => Effect.Effect<MemoryUpdateResponse, SupermemoryError>;

  /**
   * Update a memory by creating a new version (v4 API).
   *
   * @since 4.0.0
   */
  readonly updateMemory: (
    params: MemoryUpdateMemoryParams
  ) => Effect.Effect<MemoryUpdateMemoryResponse, SupermemoryError>;

  /**
   * Delete a memory/document by ID.
   *
   * @param id - The memory ID or customId to delete
   * @returns Effect that completes when deleted
   *
   * @example
   * ```typescript
   * yield* MemoriesService.delete("mem_abc123");
   * ```
   */
  readonly delete: (id: string) => Effect.Effect<void, SupermemoryError>;

  /**
   * Bulk delete documents by IDs or container tags.
   *
   * @since 4.0.0
   */
  readonly deleteBulk: (
    params: MemoryDeleteBulkParams
  ) => Effect.Effect<MemoryDeleteBulkResponse, SupermemoryError>;

  /**
   * Forget (soft delete) a memory entry (v4 API).
   *
   * @since 4.0.0
   */
  readonly forget: (
    params: MemoryForgetParams
  ) => Effect.Effect<MemoryForgetResponse, SupermemoryError>;

  /**
   * Upload a file to be processed as a memory.
   *
   * @param params - File and upload options
   * @returns Effect with the created memory ID and status
   *
   * @example
   * ```typescript
   * const file = new File(["content"], "document.pdf", { type: "application/pdf" });
   * const result = yield* MemoriesService.uploadFile({
   *   file,
   *   containerTags: "user_123",
   *   fileType: "pdf"
   * });
   * ```
   */
  readonly uploadFile: (
    params: MemoryUploadFileParams
  ) => Effect.Effect<MemoryUploadFileResponse, SupermemoryError>;
};
