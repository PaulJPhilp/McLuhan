import { Effect } from "effect";
import { FC, useEffect, useState } from "react";
import {
	ModelConfigService,
	getModelColor,
} from "../services/ModelConfigService/index.js";
import type { ModelInfo } from "../services/ModelConfigService/index.js";
import { sharedRuntime } from "../context/atomRuntime.js";

export interface ModelSelectorProps {
	selectedModels: readonly string[];
	onSelectionChange: (modelIds: string[]) => void;
}

/**
 * Model selector component with multi-select support
 * Groups models by provider and shows color swatches
 */
export const ModelSelector: FC<ModelSelectorProps> = ({
	selectedModels,
	onSelectionChange,
}) => {
	const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		const loadModels = async () => {
			const program = Effect.gen(function* () {
				const service = yield* ModelConfigService;
				return yield* service.getAvailableModels();
			});

			try {
				const models = await sharedRuntime.runPromise(
					program.pipe(Effect.provide(ModelConfigService.Default())),
				);
				// Show all models, but indicate which ones need API keys
				setAvailableModels(models);
			} catch (error) {
				console.error("Failed to load models:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadModels();
	}, []);

	const handleToggleModel = (modelId: string) => {
		const isSelected = selectedModels.includes(modelId);
		if (isSelected) {
			onSelectionChange(selectedModels.filter((id) => id !== modelId));
		} else {
			onSelectionChange([...selectedModels, modelId]);
		}
	};

	// Group models by provider
	const modelsByProvider = availableModels.reduce(
		(acc, model) => {
			if (!acc[model.provider]) {
				acc[model.provider] = [];
			}
			acc[model.provider]!.push(model);
			return acc;
		},
		{} as Record<string, ModelInfo[]>,
	);

	if (isLoading) {
		return <div className="mb-2 text-xs text-gray-500">Loading models...</div>;
	}

	if (availableModels.length === 0) {
		return (
			<div className="mb-2 text-xs text-gray-500">
				No models available. Check your configuration.
			</div>
		);
	}

	return (
		<div className="mb-2">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
			>
				<span>
					{selectedModels.length === 0
						? "Select models"
						: `${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} selected`}
				</span>
				<span>{isExpanded ? "▼" : "▶"}</span>
			</button>

			{isExpanded && (
				<div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 max-h-64 overflow-y-auto">
					{Object.entries(modelsByProvider).map(([provider, models]) => (
						<div key={provider} className="mb-3 last:mb-0">
							<div className="text-xs font-semibold text-gray-700 mb-1 capitalize">
								{provider}
							</div>
							<div className="space-y-1">
								{models.map((model) => {
									const isSelected = selectedModels.includes(model.modelId);
									const modelColor = getModelColor(model.modelId);
									const isDisabled = !model.hasApiKey;

									return (
										<label
											key={model.modelId}
											className={`flex items-center gap-2 p-1 rounded text-xs ${
												isDisabled
													? "opacity-50 cursor-not-allowed"
													: "hover:bg-gray-100 cursor-pointer"
											}`}
										>
											<input
												type="checkbox"
												checked={isSelected}
												disabled={isDisabled}
												onChange={() => handleToggleModel(model.modelId)}
												className="rounded border-gray-300"
											/>
											<div
												className="w-3 h-3 rounded border border-gray-300"
												style={{ backgroundColor: modelColor.bg }}
											/>
											<span
												className={
													isDisabled ? "text-gray-400" : "text-gray-700"
												}
											>
												{model.displayName}
											</span>
											{isDisabled && (
												<span className="text-[10px] text-gray-400 ml-auto">
													(API key needed)
												</span>
											)}
										</label>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
