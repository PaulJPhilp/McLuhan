import { FC } from "react";
import { getModelColor } from "../services/ModelConfigService/index.js";

export interface ModelLoadingIndicatorProps {
	modelId: string;
	provider: string;
	displayName?: string;
}

/**
 * Loading indicator for a specific model
 * Shows model name and color-coded spinner
 */
export const ModelLoadingIndicator: FC<ModelLoadingIndicatorProps> = ({
	modelId,
	provider,
	displayName,
}) => {
	const modelColor = getModelColor(modelId);
	const name = displayName || modelId;

	return (
		<div className="flex justify-start mb-4">
			<div
				className="max-w-md px-4 py-2 rounded-lg border"
				style={{
					backgroundColor: modelColor.bg,
					color: modelColor.text,
					borderColor: modelColor.border,
				}}
			>
				<div className="flex items-center gap-2">
					<div className="flex space-x-1">
						<div
							className="w-2 h-2 rounded-full animate-bounce"
							style={{ backgroundColor: modelColor.text }}
						/>
						<div
							className="w-2 h-2 rounded-full animate-bounce delay-100"
							style={{ backgroundColor: modelColor.text }}
						/>
						<div
							className="w-2 h-2 rounded-full animate-bounce delay-200"
							style={{ backgroundColor: modelColor.text }}
						/>
					</div>
					<span className="text-sm font-medium">{name}</span>
					<span className="text-xs opacity-70">is thinking...</span>
				</div>
			</div>
		</div>
	);
};
