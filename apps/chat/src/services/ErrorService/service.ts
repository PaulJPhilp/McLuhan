import { Effect } from "effect";
import type { ErrorServiceApi } from "./api.js";
import {
	categorizeErrorMessage,
	createFormattedError,
	extractErrorMessage,
	getCategoryMessage,
	getCategorySuggestion,
	isCategoryRecoverable,
} from "./helpers.js";

/**
 * ErrorService - centralized error handling and formatting
 */
export class ErrorService extends Effect.Service<ErrorService>()(
	"chat/ErrorService",
	{
		effect: Effect.fn(function* () {
			return {
				formatError: (error: unknown) =>
					Effect.sync(() => {
						const message = extractErrorMessage(error);
						const category = categorizeErrorMessage(message);
						return createFormattedError(error, category);
					}),

				categorizeError: (error: unknown) =>
					Effect.sync(() => {
						const message = extractErrorMessage(error);
						return categorizeErrorMessage(message);
					}),

				isRecoverable: (error: unknown) =>
					Effect.sync(() => {
						const message = extractErrorMessage(error);
						const category = categorizeErrorMessage(message);
						return isCategoryRecoverable(category);
					}),

				getUserMessage: (error: unknown) =>
					Effect.sync(() => {
						const message = extractErrorMessage(error);
						const category = categorizeErrorMessage(message);
						return getCategoryMessage(category, message);
					}),

				getSuggestion: (error: unknown) =>
					Effect.sync(() => {
						const message = extractErrorMessage(error);
						const category = categorizeErrorMessage(message);
						return getCategorySuggestion(category);
					}),
			} satisfies ErrorServiceApi;
		}),
	},
) {}
