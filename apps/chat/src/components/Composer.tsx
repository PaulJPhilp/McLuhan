import clsx from "clsx";
import { FC, useRef, useState } from "react";
import { useChatContext } from "../context/ChatContext";

/**
 * Composer component (like assistant-ui's Composer)
 * Input area for the user to type messages
 */
export const Composer: FC = () => {
	const { isLoading, sendMessage } = useChatContext();
	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!input.trim() || isLoading || isSending) return;

		setIsSending(true);

		try {
			await sendMessage(input);
			setInput("");
			// Reset textarea height
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Create a synthetic form event for handleSubmit
			const syntheticEvent = {
				...e,
				preventDefault: () => e.preventDefault(),
				stopPropagation: () => e.stopPropagation(),
				currentTarget: e.currentTarget.form || e.currentTarget,
				target: e.target,
			} as unknown as React.FormEvent<HTMLFormElement>;
			handleSubmit(syntheticEvent);
		}
	};

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);

		// Auto-expand textarea
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
		}
	};

	return (
		<div className="border-t border-chat-border px-6 py-4 bg-white">
			<form onSubmit={handleSubmit} className="flex gap-3">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					placeholder="Type your message... (Shift+Enter for new line)"
					disabled={isLoading || isSending}
					className={clsx(
						"flex-1 px-4 py-2 border border-chat-border rounded-lg",
						"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
						"resize-none max-h-48",
						"disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
					)}
					rows={1}
				/>

				<button
					type="submit"
					disabled={!input.trim() || isLoading || isSending}
					className={clsx(
						"px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
						"hover:bg-blue-600",
						{
							"bg-blue-500 text-white": !isLoading && !isSending,
							"bg-blue-300 text-white cursor-not-allowed":
								isLoading || isSending,
							"bg-gray-200 text-gray-400 cursor-not-allowed": !input.trim(),
						},
					)}
				>
					{isSending ? "↓" : "↑"}
				</button>
			</form>

			<div className="mt-2 text-xs text-gray-500">
				Tip: Press <kbd className="bg-gray-100 px-1 rounded">Shift+Enter</kbd>{" "}
				for a new line, <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> to
				send
			</div>
		</div>
	);
};
