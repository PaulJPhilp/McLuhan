import clsx from "clsx";
import { FC } from "react";
import Markdown from "react-markdown";
import { Message } from "../actors/ThreadActor";

export interface MessageProps {
	message: Message;
}

/**
 * Individual message component (like assistant-ui's Message)
 */
export const MessageComponent: FC<MessageProps> = ({ message }) => {
	const isUser = message.role === "user";

	return (
		<div
			className={clsx("flex mb-4", {
				"justify-end": isUser,
				"justify-start": !isUser,
			})}
		>
			<div
				className={clsx("max-w-md px-4 py-2 rounded-lg", {
					"bg-blue-100 text-gray-900": isUser,
					"bg-gray-100 text-gray-900": !isUser && message.role === "assistant",
					"bg-gray-200 text-gray-700 italic": message.role === "system",
				})}
			>
				{message.role === "assistant" || message.role === "system" ? (
					<div className="prose prose-sm max-w-none">
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
					</div>
				) : (
					<p className="text-sm">{message.content}</p>
				)}

				<span className="text-xs text-gray-500 mt-1 block">
					{new Date(message.timestamp).toLocaleTimeString()}
				</span>
			</div>
		</div>
	);
};
