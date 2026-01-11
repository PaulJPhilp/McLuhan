import clsx from "clsx";
import { Effect } from "effect";
import { FC, useEffect, useState } from "react";
import Markdown from "react-markdown";
import type { Artifact } from "effect-artifact";
import { Message } from "../actors/ThreadActor";
import { getModelColor } from "../services/ModelConfigService/index.js";
import { ArtifactStorageService } from "../services/ArtifactStorageService/index.js";
import { MessageMetrics } from "./MessageMetrics.js";
import { ArtifactRenderer } from "./artifacts/index.js";
import { sharedRuntime } from "../context/atomRuntime.js";
import type { ModelStreamMetrics } from "../services/MultiModelStreamingService/types.js";

export interface MessageProps {
	message: Message;
}

/**
 * Individual message component (like assistant-ui's Message)
 */
export const MessageComponent: FC<MessageProps> = ({ message }) => {
	const isUser = message.role === "user";
	const [artifacts, setArtifacts] = useState<readonly Artifact[]>([]);

	// Load artifacts from storage if the message has them
	useEffect(() => {
		const hasArtifacts =
			message.metadata &&
			typeof message.metadata === "object" &&
			(message.metadata as Record<string, unknown>).hasArtifacts === true;

		if (hasArtifacts) {
			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;
				return yield* storage.getArtifacts(message.id);
			});

			sharedRuntime
				.runPromise(program)
				.then(setArtifacts)
				.catch((err) => {
					console.warn(
						`Failed to load artifacts for message ${message.id}:`,
						err,
					);
					setArtifacts([]);
				});
		}
	}, [message.id, message.metadata]);

	// Get model info from metadata if present
	const modelId =
		message.metadata && typeof message.metadata === "object"
			? (message.metadata as Record<string, unknown>).modelId as
					| string
					| undefined
			: undefined;
	const modelProvider =
		message.metadata && typeof message.metadata === "object"
			? (message.metadata as Record<string, unknown>).modelProvider as
					| string
					| undefined
			: undefined;
	const metrics =
		message.metadata &&
		typeof message.metadata === "object" &&
		(message.metadata as Record<string, unknown>).metrics
			? ((message.metadata as Record<string, unknown>)
					.metrics as ModelStreamMetrics)
			: undefined;
	const error =
		message.metadata &&
		typeof message.metadata === "object" &&
		(message.metadata as Record<string, unknown>).error
			? ((message.metadata as Record<string, unknown>).error as string)
			: undefined;
	const success =
		message.metadata &&
		typeof message.metadata === "object" &&
		typeof (message.metadata as Record<string, unknown>).success === "boolean"
			? ((message.metadata as Record<string, unknown>).success as boolean)
			: undefined;

	// Debug logging for assistant messages with potential errors
	if (
		message.role === "assistant" &&
		(!success ||
			error ||
			!message.content ||
			message.content === "No response generated")
	) {
		console.log(
			`[Message] Debug for model ${message.metadata && typeof message.metadata === "object" ? (message.metadata as Record<string, unknown>).modelId : "unknown"}:`,
			{
				hasError: !!error,
				error,
				success,
				contentLength: message.content?.length || 0,
				content: message.content?.substring(0, 50),
				metadata: message.metadata,
			},
		);
	}

	// Determine if we should show error box:
	// - If error exists in metadata
	// - If success is explicitly false
	// - If content is "No response generated" (indicates failure)
	// - If success is undefined and content is empty or "No response generated"
	const shouldShowError =
		error ||
		success === false ||
		(message.role === "assistant" &&
			(message.content === "No response generated" ||
				(!success &&
					(!message.content || message.content.trim().length === 0))));

	// Get model color if this is an assistant message with a model
	const modelColor =
		message.role === "assistant" && modelId && typeof modelId === "string"
			? getModelColor(modelId)
			: null;

	// Determine background and text colors
	const bgColor = isUser
		? "bg-blue-100"
		: modelColor
			? undefined // Will use inline style
			: message.role === "system"
				? "bg-gray-200"
				: "bg-gray-100";
	const textColor = isUser
		? "text-gray-900"
		: modelColor
			? undefined // Will use inline style
			: message.role === "system"
				? "text-gray-700 italic"
				: "text-gray-900";

	const inlineStyle =
		modelColor && !isUser
			? {
					backgroundColor: modelColor.bg,
					color: modelColor.text,
					borderColor: modelColor.border,
				}
			: undefined;

	return (
		<div
			className={clsx("flex mb-4", {
				"justify-end": isUser,
				"justify-start": !isUser,
			})}
		>
			<div
				className={clsx("max-w-md px-4 py-2 rounded-lg", bgColor, textColor, {
					border: modelColor && !isUser,
				})}
				style={inlineStyle}
			>
				{message.role === "assistant" || message.role === "system" ? (
					<div>
						<div className="prose prose-sm max-w-none">
							{shouldShowError ? (
								<div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
									<p className="text-sm font-semibold text-red-900 mb-1">
										⚠️ Error
									</p>
									<p className="text-sm text-red-800 whitespace-pre-wrap">
										{error ||
											(message.content === "No response generated"
												? "Model failed to generate a response. Check console for details."
												: message.content) ||
											"Unknown error occurred"}
									</p>
								</div>
							) : message.content ? (
								<Markdown
									components={{
										p: ({ node, ...props }) => (
											<p className="mb-2 last:mb-0" {...props} />
										),
										code: (props) => {
											const isInline =
												"inline" in props && typeof props.inline === "boolean"
													? props.inline
													: false;
											return isInline ? (
												<code
													className="bg-gray-200 px-1 rounded text-sm"
													{...props}
												/>
											) : (
												<code
													className="block bg-gray-200 p-2 rounded text-sm mb-2"
													{...props}
												/>
											);
										},
									}}
								>
									{message.content}
								</Markdown>
							) : (
								<p className="text-sm text-gray-400 italic">Thinking...</p>
							)}
						</div>

						{/* Render artifacts if present */}
						{artifacts.length > 0 && (
							<div className="mt-4 space-y-2">
								{artifacts.map((artifact) => (
									<ArtifactRenderer key={artifact.id} artifact={artifact} />
								))}
							</div>
						)}
					</div>
				) : (
					<p className="text-sm">{message.content}</p>
				)}

				<div className="flex items-center gap-2 mt-1 flex-wrap">
					<span className="text-[5px] text-gray-500">
						{new Date(message.timestamp).toLocaleTimeString()}
					</span>
					{modelId && typeof modelId === "string" && (
						<span
							className="text-[5px] px-1.5 py-0.5 rounded"
							style={{
								backgroundColor: modelColor?.bg || "#f3f4f6",
								color: modelColor?.text || "#6b7280",
							}}
						>
							{(typeof modelProvider === "string" ? modelProvider : "") as any}{" "}
							{(modelId as any) || ""}
						</span>
					)}
					{/* Display metrics for assistant messages */}
					{message.role === "assistant" && metrics && (
						<MessageMetrics metrics={metrics} />
					)}
				</div>
			</div>
		</div>
	);
};
