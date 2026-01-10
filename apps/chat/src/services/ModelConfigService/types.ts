/**
 * Model configuration types
 */

export interface ModelConfig {
	readonly modelId: string;
	readonly provider: string;
	readonly displayName: string;
	readonly color: ModelColor;
}

export interface ModelColor {
	readonly bg: string;
	readonly text: string;
	readonly border?: string;
}

export interface ModelInfo {
	readonly modelId: string;
	readonly provider: string;
	readonly displayName: string;
	readonly hasApiKey: boolean;
}
