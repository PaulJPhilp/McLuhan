import { FC, useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import { useChatContext } from "../context/ChatContext";
import { MessageComponent } from "./Message";
import { ModelLoadingIndicator } from "./ModelLoadingIndicator";
import { ModelConfigService } from "../services/ModelConfigService/index.js";
import { sharedRuntime } from "../context/atomRuntime.js";

/**
 * ChatThread component (like assistant-ui's Thread)
 * Displays the message history
 */
export const ChatThread: FC = () => {
	const { messages, isLoading, error, loadingModels } = useChatContext();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const [modelInfos, setModelInfos] = useState<Map<string, { displayName: string; provider: string }>>(new Map());

	// Load model info for loading models
	useEffect(() => {
		if (loadingModels.length === 0) {
			setModelInfos(new Map());
			return;
		}

		const loadModelInfos = async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelConfigService;
				const availableModels = yield* service.getAvailableModels();
				return availableModels;
			});

			try {
				const availableModels = await sharedRuntime.runPromise(
					program.pipe(Effect.provide(ModelConfigService.Default())),
				);

				const infos = new Map<string, { displayName: string; provider: string }>();
				for (const modelId of loadingModels) {
					const model = availableModels.find((m) => m.modelId === modelId);
					if (model) {
						infos.set(modelId, {
							displayName: model.displayName,
							provider: model.provider,
						});
					}
				}
				setModelInfos(infos);
			} catch (error) {
				console.error("Failed to load model info:", error);
			}
		};

		loadModelInfos();
	}, [loadingModels]);

	const scrollToBottom = () => {
		if (autoScroll && messagesEndRef.current?.scrollIntoView) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, autoScroll, loadingModels]);

	return (
		<div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
			{messages.length === 0 && !isLoading ? (
				<div className="h-full flex items-center justify-center text-center text-gray-400">
					<div>
						<h2 className="text-lg font-semibold mb-2">Start a conversation</h2>
						<p>Type a message below to begin.</p>
					</div>
				</div>
			) : (
				<div className="space-y-4">
					{messages.map((message) => {
						console.log("Rendering message:", {
							id: message.id,
							role: message.role,
							contentLength: message.content.length,
							hasMetadata: !!message.metadata,
							metadata: message.metadata,
						});
						return <MessageComponent key={message.id} message={message} />;
					})}

					{/* Per-model loading indicators */}
					{loadingModels.map((modelId) => {
						const modelInfo = modelInfos.get(modelId);
						// Don't show loading indicator if we already have a message for this model
						const hasMessage = messages.some(
							(m) =>
								m.role === "assistant" &&
								m.metadata &&
								typeof m.metadata === "object" &&
								(m.metadata as Record<string, unknown>).modelId === modelId,
						);
						
						if (hasMessage) return null;

						return (
							<ModelLoadingIndicator
								key={`loading-${modelId}`}
								modelId={modelId}
								provider={modelInfo?.provider || "unknown"}
								displayName={modelInfo?.displayName}
							/>
						);
					})}

					{/* Fallback loading indicator for single-model mode */}
					{isLoading && loadingModels.length === 0 && (
						<div className="flex justify-start">
							<div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
								<div className="flex space-x-2">
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
								</div>
							</div>
						</div>
					)}

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg my-4">
							<p className="font-semibold mb-1">⚠️ Error</p>
							<p className="text-sm">{error}</p>
							{error.includes("API key") && (
								<p className="text-xs mt-2 text-red-600">
									Tip: Create a{" "}
									<code className="bg-red-100 px-1 rounded">.env.local</code>{" "}
									file in the{" "}
									<code className="bg-red-100 px-1 rounded">apps/chat</code>{" "}
									directory with your API key.
								</p>
							)}
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>
			)}

			{messages.length > 0 && (
				<button
					onClick={() => setAutoScroll(!autoScroll)}
					className="mt-4 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-400"
				>
					{autoScroll ? "📌 Auto-scroll" : "📍 Manual scroll"}
				</button>
			)}
		</div>
	);
};
