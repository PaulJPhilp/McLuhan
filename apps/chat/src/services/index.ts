// ChatRuntime
export {
	ChatRuntime,
	getProviderConfig,
	toEffectiveMessage,
	toEffectiveMessages,
} from "./ChatRuntime/index.js";
export type { ChatRuntimeApi, ChatRuntimeConfig } from "./ChatRuntime/index.js";

// ConfigService
export {
	ChatEnvSchema,
	ConfigError,
	ConfigService,
	MissingApiKeyError,
	getDefaultModel,
	getViteEnvValues,
	maskApiKey,
} from "./ConfigService/index.js";
export type {
	AIProvider,
	AIProviderConfig,
	ChatEnvValues,
	ConfigServiceApi,
} from "./ConfigService/index.js";

// ErrorService
export {
	ErrorCategorizationError,
	ErrorFormattingError,
	ErrorProcessingError,
	ErrorService,
	categorizeErrorMessage,
	createFormattedError,
	extractErrorMessage,
	getCategoryMessage,
	getCategorySuggestion,
	isCategoryRecoverable,
} from "./ErrorService/index.js";
export type {
	ErrorCategory,
	ErrorDisplayOptions,
	ErrorServiceApi,
	FormattedError,
} from "./ErrorService/index.js";

// HumeService
export {
	EmotionDetectionError,
	HumeService,
	SessionEndError,
	SessionNotFoundError,
	SessionStartError,
	VoiceStateError,
} from "./HumeService/index.js";
export type {
	EmotionData,
	HumeConfig,
	HumeServiceApi,
	VoiceState,
} from "./HumeService/index.js";

// NotificationService
export {
	DEFAULT_DURATION,
	DEFAULT_MAX_NOTIFICATIONS,
	DEFAULT_POSITION,
	NotificationService,
	createNotification,
	getNotificationClasses,
	getNotificationIcon,
	getPositionClasses,
} from "./NotificationService/index.js";
export type {
	Notification,
	NotificationConfig,
	NotificationOptions,
	NotificationPosition,
	NotificationServiceApi,
	NotificationState,
	NotificationType,
} from "./NotificationService/index.js";

// PersistenceService
export {
	InvalidStorageDataError,
	PersistenceService,
	StorageReadError,
	StorageUnavailableError,
	StorageWriteError,
	ThreadEntrySchema,
	ThreadNotFoundError,
	ThreadsStorageSchema,
	isLocalStorageAvailable,
} from "./PersistenceService/index.js";
export type {
	PersistenceServiceApi,
	ThreadEntry,
} from "./PersistenceService/index.js";

// StreamingService
export {
	EmptyStreamError,
	InvalidMessagesError,
	StreamError,
	StreamTimeoutError,
	StreamingService,
} from "./StreamingService/index.js";
export type {
	OnChunkCallback,
	OnCompleteCallback,
	OnErrorCallback,
	StreamChatOptions,
	StreamResult,
	StreamState,
	StreamingServiceApi,
} from "./StreamingService/index.js";

// ThreadService
export {
	InvalidThreadMessageError,
	InvalidThreadStateError,
	ThreadOperationError,
	ThreadService,
} from "./ThreadService/index.js";
export type { ThreadServiceApi } from "./ThreadService/index.js";

// ModelConfigService
export {
	ModelConfigService,
	getModelColor,
	getAllColors,
} from "./ModelConfigService/index.js";
export type {
	ModelConfig,
	ModelColor,
	ModelInfo,
	ModelConfigServiceApi,
} from "./ModelConfigService/index.js";

// MultiModelStreamingService
export {
	MultiModelStreamingService,
	MultiModelStreamError,
	ModelStreamError,
} from "./MultiModelStreamingService/index.js";
export type {
	MultiModelStreamingServiceApi,
	ModelStreamResult,
	MultiModelStreamOptions,
} from "./MultiModelStreamingService/index.js";
export type { ModelConfig as MultiModelStreamConfig } from "./MultiModelStreamingService/types.js";
