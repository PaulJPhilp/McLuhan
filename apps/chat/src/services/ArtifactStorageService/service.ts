/**
 * ArtifactStorageService - localStorage persistence for artifacts
 * Stores and retrieves artifacts associated with specific messages
 *
 * Handles localStorage quota exceeded errors and provides utilities
 * for monitoring and managing storage space.
 */

import { Data, Effect } from "effect"
import type { Artifact } from "effect-artifact"

export class ArtifactStorageError extends Data.TaggedError(
  "ArtifactStorageError"
)<{
  readonly message: string
  readonly code?: "QUOTA_EXCEEDED" | "NOT_AVAILABLE" | "INVALID_DATA" | "UNKNOWN"
  readonly cause?: Error
}> {}

/**
 * Storage stats for monitoring quota usage
 */
export interface StorageStats {
  readonly totalBytes: number
  readonly artifactCount: number
  readonly quotaEstimate: number
  readonly usagePercent: number
}

export interface ArtifactStorageServiceSchema {
  readonly saveArtifacts: (
    messageId: string,
    artifacts: readonly Artifact[]
  ) => Effect.Effect<void, ArtifactStorageError>

  readonly getArtifacts: (
    messageId: string
  ) => Effect.Effect<readonly Artifact[], ArtifactStorageError>

  readonly deleteArtifacts: (
    messageId: string
  ) => Effect.Effect<void, ArtifactStorageError>

  readonly getStorageStats: () => Effect.Effect<StorageStats, ArtifactStorageError>

  readonly clearOldArtifacts: (
    olderThanMs: number
  ) => Effect.Effect<number, ArtifactStorageError>
}

export class ArtifactStorageService extends Effect.Service<ArtifactStorageService>()(
  "ArtifactStorageService",
  {
    effect: Effect.fn(function* () {
      const STORAGE_KEY_PREFIX = "chat-artifacts:"
      const METADATA_KEY = "chat-artifacts:metadata"
      const QUOTA_ESTIMATE = 5_242_880 // 5MB estimate for localStorage

      /**
       * Detect specific error types
       */
      const getErrorCode = (error: unknown): "QUOTA_EXCEEDED" | "NOT_AVAILABLE" | "INVALID_DATA" | "UNKNOWN" => {
        if (error instanceof Error) {
          if (error.name === "QuotaExceededError") return "QUOTA_EXCEEDED"
          if (error.message.includes("quota")) return "QUOTA_EXCEEDED"
          if (error.message.includes("not available")) return "NOT_AVAILABLE"
          if (error.message.includes("JSON")) return "INVALID_DATA"
        }
        return "UNKNOWN"
      }

      const saveArtifacts = (
        messageId: string,
        artifacts: readonly Artifact[]
      ): Effect.Effect<void, ArtifactStorageError> =>
        Effect.sync(() => {
          try {
            const key = `${STORAGE_KEY_PREFIX}${messageId}`
            const data = JSON.stringify(artifacts)
            localStorage.setItem(key, data)

            // Update metadata
            try {
              const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || "{}")
              metadata[messageId] = { savedAt: Date.now(), size: data.length }
              localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
            } catch {
              // Ignore metadata errors
            }
          } catch (error) {
            const code = getErrorCode(error)
            throw new ArtifactStorageError({
              message:
                code === "QUOTA_EXCEEDED"
                  ? "Storage quota exceeded. Try clearing old artifacts or browsing history."
                  : `Failed to save artifacts to localStorage`,
              code,
              cause: error instanceof Error ? error : undefined,
            })
          }
        })

      const getArtifacts = (
        messageId: string
      ): Effect.Effect<readonly Artifact[], ArtifactStorageError> =>
        Effect.sync(() => {
          try {
            const key = `${STORAGE_KEY_PREFIX}${messageId}`
            const data = localStorage.getItem(key)
            return data ? (JSON.parse(data) as Artifact[]) : []
          } catch (error) {
            const code = getErrorCode(error)
            throw new ArtifactStorageError({
              message:
                code === "INVALID_DATA"
                  ? "Stored data is corrupted. Try clearing artifacts for this message."
                  : "Failed to retrieve artifacts from localStorage",
              code,
              cause: error instanceof Error ? error : undefined,
            })
          }
        })

      const deleteArtifacts = (
        messageId: string
      ): Effect.Effect<void, ArtifactStorageError> =>
        Effect.sync(() => {
          try {
            const key = `${STORAGE_KEY_PREFIX}${messageId}`
            localStorage.removeItem(key)

            // Update metadata
            try {
              const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || "{}")
              delete metadata[messageId]
              localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
            } catch {
              // Ignore metadata errors
            }
          } catch (error) {
            throw new ArtifactStorageError({
              message: "Failed to delete artifacts from localStorage",
              cause: error instanceof Error ? error : undefined,
            })
          }
        })

      const getStorageStats = (): Effect.Effect<StorageStats, ArtifactStorageError> =>
        Effect.sync(() => {
          try {
            let totalBytes = 0
            let artifactCount = 0

            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key?.startsWith(STORAGE_KEY_PREFIX) && key !== METADATA_KEY) {
                const value = localStorage.getItem(key) || ""
                totalBytes += key.length + value.length
                artifactCount++
              }
            }

            return {
              totalBytes,
              artifactCount,
              quotaEstimate: QUOTA_ESTIMATE,
              usagePercent: (totalBytes / QUOTA_ESTIMATE) * 100,
            }
          } catch (error) {
            throw new ArtifactStorageError({
              message: "Failed to get storage stats",
              cause: error instanceof Error ? error : undefined,
            })
          }
        })

      const clearOldArtifacts = (olderThanMs: number): Effect.Effect<number, ArtifactStorageError> =>
        Effect.sync(() => {
          try {
            let deletedCount = 0
            const cutoffTime = Date.now() - olderThanMs

            try {
              const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || "{}")
              const keysToDelete: string[] = []

              for (const [messageId, info] of Object.entries(metadata)) {
                if (
                  typeof info === "object" &&
                  info !== null &&
                  "savedAt" in info &&
                  typeof (info as any).savedAt === "number"
                ) {
                  if ((info as any).savedAt < cutoffTime) {
                    const key = `${STORAGE_KEY_PREFIX}${messageId}`
                    localStorage.removeItem(key)
                    keysToDelete.push(messageId)
                    deletedCount++
                  }
                }
              }

              // Update metadata
              for (const messageId of keysToDelete) {
                delete metadata[messageId]
              }
              localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
            } catch {
              // Fall back to deleting all if metadata is corrupted
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i)
                if (key?.startsWith(STORAGE_KEY_PREFIX) && key !== METADATA_KEY) {
                  localStorage.removeItem(key)
                  deletedCount++
                }
              }
            }

            return deletedCount
          } catch (error) {
            throw new ArtifactStorageError({
              message: "Failed to clear old artifacts",
              cause: error instanceof Error ? error : undefined,
            })
          }
        })

      return {
        saveArtifacts,
        getArtifacts,
        deleteArtifacts,
        getStorageStats,
        clearOldArtifacts,
      } satisfies ArtifactStorageServiceSchema
    }),
  }
) {}
