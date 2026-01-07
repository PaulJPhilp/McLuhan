import clsx from "clsx";
import { FC } from "react";
import Markdown from "react-markdown";
import { Message } from "../actors/ThreadActor";
import { getModelColor } from "../services/ModelConfigService/index.js";
import { MessageMetrics } from "./MessageMetrics.js";
import type { ModelStreamMetrics } from "../services/MultiModelStreamingService/types.js";

export interface MessageProps {
	message: Message;
}

/**
 * Individual message component (like assistant-ui's Message)
 */
export const MessageComponent: FC<MessageProps> = ({ message }) => {
	const isUser = message.role === "user";

	// Get model info from metadata if present
	const modelId =
		message.metadata && typeof message.metadata === "object"
			? (message.metadata as Record<string, unknown>).modelId
			: undefined;
	const modelProvider =
		message.metadata && typeof message.metadata === "object"
			? (message.metadata as Record<string, unknown>).modelProvider
			: undefined;
	const metrics =
		message.metadata &&
		typeof message.metadata === "object" &&
		(message.metadata as Record<string, unknown>).metrics
			? ((message.metadata as Record<string, unknown>).metrics as ModelStreamMetrics)
			: undefined;

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
					"border": modelColor && !isUser,
				})}
				style={inlineStyle}
			>
				{message.role === "assistant" || message.role === "system" ? (
					<div className="prose prose-sm max-w-none">
						{message.content ? (
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
							{typeof modelProvider === "string" ? modelProvider : ""} {modelId}
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
