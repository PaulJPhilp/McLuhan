import { FC } from "react";
import type { ModelStreamMetrics } from "../services/MultiModelStreamingService/types.js";

export interface MessageMetricsProps {
	metrics: ModelStreamMetrics;
}

/**
 * Format milliseconds to a readable string
 */
function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	const seconds = ms / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

/**
 * Format token count with commas
 */
function formatTokens(count: number): string {
	return count.toLocaleString();
}

/**
 * Display metrics for a message (TTFT, duration, tokens)
 */
export const MessageMetrics: FC<MessageMetricsProps> = ({ metrics }) => {
	const parts: string[] = [];

	// TTFT
	if (metrics.timeToFirstTokenMs !== null) {
		parts.push(`TTFT: ${formatDuration(metrics.timeToFirstTokenMs)}`);
	} else {
		parts.push("TTFT: N/A");
	}

	// Duration
	parts.push(`Duration: ${formatDuration(metrics.totalDurationMs)}`);

	// Tokens
	parts.push(`Tokens: ${formatTokens(metrics.outputTokens)}`);

	return (
		<span className="text-[5px] text-gray-500 flex items-center gap-1">
			{parts.map((part, index) => (
				<span key={index}>
					{part}
					{index < parts.length - 1 && (
						<span className="mx-0.5 text-gray-400">•</span>
					)}
				</span>
			))}
		</span>
	);
};
