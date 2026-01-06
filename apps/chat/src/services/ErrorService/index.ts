export type { ErrorServiceApi } from "./api.js";
export {
	ErrorCategorizationError,
	ErrorFormattingError,
	ErrorProcessingError,
} from "./errors.js";
export {
	categorizeErrorMessage,
	createFormattedError,
	extractErrorMessage,
	getCategoryMessage,
	getCategorySuggestion,
	isCategoryRecoverable,
} from "./helpers.js";
export { ErrorService } from "./service.js";
export type {
	ErrorCategory,
	ErrorDisplayOptions,
	FormattedError,
} from "./types.js";
