import { Effect, Schema } from "effect";

/**
 * Message type with role (user or assistant)
 */
export class Message extends Schema.Class<Message>("Message")({
	id: Schema.String,
	role: Schema.Literal("user", "assistant", "system"),
	content: Schema.String,
	timestamp: Schema.Number,
	metadata: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Any,
		}),
	),
}) {}

/**
 * Thread state represents the conversation
 */
export class ThreadState extends Schema.Class<ThreadState>("ThreadState")({
	id: Schema.String,
	messages: Schema.Array(Message),
	isLoading: Schema.Boolean,
	error: Schema.optional(Schema.String),
	lastUpdated: Schema.Number,
}) {}

/**
 * Events/Messages that the ThreadActor can receive
 */
export type ThreadMessage =
	| {
			type: "ADD_MESSAGE";
			payload: {
				role: "user" | "assistant" | "system";
				content: string;
				metadata?: Record<string, unknown>;
			};
	  }
	| { type: "CLEAR_MESSAGES" }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "RETRY_LAST_MESSAGE" };

/**
 * ThreadActor configuration
 */
export const createThreadActorConfig = () => {
	const initialState: ThreadState = {
		id: crypto.randomUUID(),
		messages: [],
		isLoading: false,
		error: undefined,
		lastUpdated: Date.now(),
	};

	const receive = (
		state: ThreadState,
		message: ThreadMessage,
	): Effect.Effect<ThreadState> => {
		return Effect.gen(function* () {
			switch (message.type) {
				case "ADD_MESSAGE": {
					const newMessage: Message = {
						id: crypto.randomUUID(),
						role: message.payload.role,
						content: message.payload.content,
						timestamp: Date.now(),
						...(message.payload.metadata && {
							// Effect Schema Record with object schema creates Record<string, unknown> at runtime
							metadata: message.payload.metadata as Record<string, unknown>,
						}),
					};

					console.log("ThreadActor: Adding message", {
						id: newMessage.id,
						role: newMessage.role,
						contentLength: newMessage.content.length,
						hasMetadata: !!newMessage.metadata,
						metadataKeys: newMessage.metadata ? Object.keys(newMessage.metadata) : [],
					});

					return {
						...state,
						messages: [...state.messages, newMessage],
						lastUpdated: Date.now(),
					};
				}

				case "CLEAR_MESSAGES":
					return {
						...state,
						messages: [],
						error: undefined,
						lastUpdated: Date.now(),
					};

				case "SET_LOADING":
					return {
						...state,
						isLoading: message.payload,
						lastUpdated: Date.now(),
					};

				case "SET_ERROR":
					return {
						...state,
						error: message.payload ?? undefined,
						lastUpdated: Date.now(),
					};

				case "RETRY_LAST_MESSAGE": {
					const lastUserMessageIndex = [...state.messages]
						.reverse()
						.findIndex((m) => m.role === "user");

					if (lastUserMessageIndex === -1) {
						return state;
					}

					const realIndex = state.messages.length - 1 - lastUserMessageIndex;
					const messagesAfterLastUser = state.messages.slice(realIndex + 1);

					return {
						...state,
						messages: state.messages.slice(0, realIndex + 1),
						error: undefined,
						lastUpdated: Date.now(),
					};
				}

				default:
					return state;
			}
		});
	};

	return { initialState, receive };
};
