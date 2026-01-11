/**
 * Memories Service Implementation
 *
 * @since 1.0.0
 * @module MemoriesService
 */
/** biome-ignore-all assist/source/organizeImports: Effect imports must come first */

import {
  API_ENDPOINTS,
  HTTP_METHODS,
  SERVICE_TAGS,
  SPANS,
  TELEMETRY_ATTRIBUTES,
} from "@/Constants.js";
import { type SupermemoryError, SupermemoryValidationError } from "@/Errors.js";
import { SupermemoryHttpClientService } from "@services/client/service.js";
import { Effect, Schema } from "effect";
import type { MemoriesServiceApi } from "./api.js";
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
  MemoryListResponse,
  MemoryUpdateMemoryParams,
  MemoryUpdateMemoryResponse,
  MemoryUpdateParams,
  MemoryUpdateResponse,
  MemoryUploadFileParams,
  MemoryUploadFileResponse,
  MemoryListProcessingResponse,
} from "./types.js";

/**
 * Builds query parameters for list operations.
 * @internal
 */
function buildListQueryParams(
  params?: MemoryListParams
): Record<string, string> | undefined {
  if (!params) {
    return;
  }

  const query: Record<string, string> = {};

  if (params.containerTags && params.containerTags.length > 0) {
    query.containerTags = params.containerTags.join(",");
  }
  if (params.includeContent !== undefined) {
    query.includeContent = String(params.includeContent);
  }
  if (params.limit !== undefined) {
    query.limit = String(params.limit);
  }
  if (params.page !== undefined) {
    query.page = String(params.page);
  }
  if (params.sort !== undefined) {
    query.sort = params.sort;
  }
  if (params.order !== undefined) {
    query.order = params.order;
  }
  if (params.filters !== undefined) {
    query.filters = JSON.stringify(params.filters);
  }

  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * Create the memories service implementation.
 *
 * @since 1.0.0
 * @category Constructors
 */
const makeMemoriesService = Effect.gen(function* () {
  const httpClient = yield* SupermemoryHttpClientService;

  const add = (
    params: MemoryAddParams
  ): Effect.Effect<MemoryAddResponse, SupermemoryError> =>
    Effect.gen(function* () {
      // Validate content is non-empty
      yield* Schema.decodeUnknown(Schema.String.pipe(Schema.minLength(1)))(
        params.content
      ).pipe(
        Effect.mapError(
          (error) =>
            new SupermemoryValidationError({
              message: "Content must be a non-empty string",
              details: error,
            })
        )
      );

      // Build request body
      const body: Record<string, unknown> = {
        content: params.content,
      };
      if (params.containerTag) {
        body.containerTag = params.containerTag;
      }
      if (params.customId) {
        body.customId = params.customId;
      }
      if (params.metadata) {
        body.metadata = params.metadata;
      }

      return yield* httpClient.request<MemoryAddResponse, unknown, never>(
        HTTP_METHODS.POST,
        API_ENDPOINTS.MEMORIES.BASE,
        { body }
      );
    }).pipe(
      Effect.withSpan(SPANS.INGEST_ADD_TEXT, {
        attributes: {
          [TELEMETRY_ATTRIBUTES.CONTENT_LENGTH]: params.content.length,
          [TELEMETRY_ATTRIBUTES.HAS_TAGS]: params.containerTag !== undefined,
          [TELEMETRY_ATTRIBUTES.HAS_CUSTOM_ID]: params.customId !== undefined,
        },
      })
    );

  const batchAdd = (
    params: MemoryBatchAddParams
  ): Effect.Effect<MemoryBatchAddResponse, SupermemoryError> =>
    Effect.gen(function* () {
      return yield* httpClient.request<MemoryBatchAddResponse, unknown, never>(
        HTTP_METHODS.POST,
        API_ENDPOINTS.MEMORIES.BATCH,
        { body: params }
      );
    }).pipe(
      Effect.withSpan("supermemory.memories.batchAdd", {
        attributes: {
          "supermemory.batch_size": params.documents.length,
        },
      })
    );

  const get = (id: string): Effect.Effect<Memory, SupermemoryError> =>
    Effect.gen(function* () {
      // Validate ID is non-empty
      yield* Schema.decodeUnknown(Schema.String.pipe(Schema.minLength(1)))(
        id
      ).pipe(
        Effect.mapError(
          (error) =>
            new SupermemoryValidationError({
              message: "ID must be a non-empty string",
              details: error,
            })
        )
      );

      return yield* httpClient.request<Memory, unknown, never>(
        HTTP_METHODS.GET,
        API_ENDPOINTS.MEMORIES.BY_ID(id),
        {}
      );
    }).pipe(
      Effect.withSpan("supermemory.memories.get", {
        attributes: {
          "supermemory.memory_id": id,
        },
      })
    );

  const list = (
    params?: MemoryListParams
  ): Effect.Effect<MemoryListResponse, SupermemoryError> =>
    Effect.gen(function* () {
      const body = params
        ? {
            ...(params.containerTags && {
              containerTags: params.containerTags,
            }),
            ...(params.filters && { filters: params.filters }),
            ...(params.includeContent !== undefined && {
              includeContent: params.includeContent,
            }),
            ...(params.limit !== undefined && { limit: params.limit }),
            ...(params.page !== undefined && { page: params.page }),
            ...(params.sort && { sort: params.sort }),
            ...(params.order && { order: params.order }),
          }
        : undefined;

      return yield* httpClient.request<MemoryListResponse, unknown, never>(
        HTTP_METHODS.POST,
        API_ENDPOINTS.MEMORIES.LIST,
        { body }
      );
    }).pipe(
      Effect.withSpan("supermemory.memories.list", {
        attributes: {
          "supermemory.limit": params?.limit,
          "supermemory.page": params?.page,
        },
      })
    );

  const listProcessing = (): Effect.Effect<
    MemoryListProcessingResponse,
    SupermemoryError
  > =>
    httpClient
      .request<MemoryListProcessingResponse, unknown, never>(
        HTTP_METHODS.GET,
        API_ENDPOINTS.MEMORIES.PROCESSING,
        {}
      )
      .pipe(Effect.withSpan("supermemory.memories.listProcessing"));

  const update = (
    id: string,
    params?: MemoryUpdateParams
  ): Effect.Effect<MemoryUpdateResponse, SupermemoryError> =>
    Effect.gen(function* () {
      // Validate ID is non-empty
      yield* Schema.decodeUnknown(Schema.String.pipe(Schema.minLength(1)))(
        id
      ).pipe(
        Effect.mapError(
          (error) =>
            new SupermemoryValidationError({
              message: "ID must be a non-empty string",
              details: error,
            })
        )
      );

      // Build request body
      const body: Record<string, unknown> = {};
      if (params?.containerTag) {
        body.containerTag = params.containerTag;
      }
      if (params?.content) {
        body.content = params.content;
      }
      if (params?.customId) {
        body.customId = params.customId;
      }
      if (params?.metadata) {
        body.metadata = params.metadata;
      }

      return yield* httpClient.request<MemoryUpdateResponse, unknown, never>(
        HTTP_METHODS.PATCH,
        API_ENDPOINTS.MEMORIES.BY_ID(id),
        { body: Object.keys(body).length > 0 ? body : undefined }
      );
    }).pipe(
      Effect.withSpan("supermemory.memories.update", {
        attributes: {
          "supermemory.memory_id": id,
        },
      })
    );

  const updateMemory = (
    params: MemoryUpdateMemoryParams
  ): Effect.Effect<MemoryUpdateMemoryResponse, SupermemoryError> =>
    httpClient
      .request<MemoryUpdateMemoryResponse, unknown, never>(
        HTTP_METHODS.PATCH,
        API_ENDPOINTS.MEMORIES.V4,
        { body: params }
      )
      .pipe(Effect.withSpan("supermemory.memories.updateMemory"));

  const deleteMemory = (id: string): Effect.Effect<void, SupermemoryError> =>
    Effect.gen(function* () {
      // Validate ID is non-empty
      yield* Schema.decodeUnknown(Schema.String.pipe(Schema.minLength(1)))(
        id
      ).pipe(
        Effect.mapError(
          (error) =>
            new SupermemoryValidationError({
              message: "ID must be a non-empty string",
              details: error,
            })
        )
      );

      yield* httpClient.request<void, unknown, never>(
        HTTP_METHODS.DELETE,
        API_ENDPOINTS.MEMORIES.BY_ID(id),
        {}
      );
    }).pipe(
      Effect.withSpan("supermemory.memories.delete", {
        attributes: {
          "supermemory.memory_id": id,
        },
      })
    );

  const deleteBulk = (
    params: MemoryDeleteBulkParams
  ): Effect.Effect<MemoryDeleteBulkResponse, SupermemoryError> =>
    httpClient
      .request<MemoryDeleteBulkResponse, unknown, never>(
        HTTP_METHODS.DELETE,
        API_ENDPOINTS.MEMORIES.BULK,
        { body: params }
      )
      .pipe(Effect.withSpan("supermemory.memories.deleteBulk"));

  const forget = (
    params: MemoryForgetParams
  ): Effect.Effect<MemoryForgetResponse, SupermemoryError> =>
    httpClient
      .request<MemoryForgetResponse, unknown, never>(
        HTTP_METHODS.DELETE,
        API_ENDPOINTS.MEMORIES.V4,
        { body: params }
      )
      .pipe(Effect.withSpan("supermemory.memories.forget"));

  const uploadFile = (
    params: MemoryUploadFileParams
  ): Effect.Effect<MemoryUploadFileResponse, SupermemoryError> =>
    Effect.gen(function* () {
      // Build multipart form data
      const formData = new FormData();
      formData.append("file", params.file as Blob);

      if (params.containerTags) {
        formData.append("containerTags", params.containerTags);
      }
      if (params.fileType) {
        formData.append("fileType", params.fileType);
      }
      if (params.metadata) {
        formData.append("metadata", params.metadata);
      }
      if (params.mimeType) {
        formData.append("mimeType", params.mimeType);
      }

      // Note: For file uploads, we need special handling
      // The httpClient may need to be extended for multipart
      return yield* httpClient.request<
        MemoryUploadFileResponse,
        unknown,
        never
      >(HTTP_METHODS.POST, API_ENDPOINTS.MEMORIES.UPLOAD, {
        body: formData as unknown,
      });
    }).pipe(
      Effect.withSpan("supermemory.memories.uploadFile", {
        attributes: {
          "supermemory.file_type": params.fileType,
        },
      })
    );

  return {
    add,
    batchAdd,
    get,
    list,
    listProcessing,
    update,
    updateMemory,
    delete: deleteMemory,
    deleteBulk,
    forget,
    uploadFile,
  } satisfies MemoriesServiceApi;
});

/**
 * Memories Service for managing documents in Supermemory.
 *
 * @since 1.0.0
 * @category Services
 */
export class MemoriesService extends Effect.Service<MemoriesService>()(
  SERVICE_TAGS.MEMORIES,
  {
    accessors: true,
    effect: makeMemoriesService,
  }
) {}
