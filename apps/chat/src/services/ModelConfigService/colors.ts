/**
 * Color palette and assignment logic for models
 */

import type { ModelColor } from "./types.js";

/**
 * Color palette for models - 8 distinct colors with good contrast
 */
const MODEL_COLORS: readonly ModelColor[] = [
	{ bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" }, // Blue
	{ bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" }, // Green
	{ bg: "#f3e8ff", text: "#6b21a8", border: "#c084fc" }, // Purple
	{ bg: "#fed7aa", text: "#9a3412", border: "#fdba74" }, // Orange
	{ bg: "#ccfbf1", text: "#134e4a", border: "#5eead4" }, // Teal
	{ bg: "#fce7f3", text: "#831843", border: "#f9a8d4" }, // Pink
	{ bg: "#fef3c7", text: "#78350f", border: "#fde047" }, // Yellow
	{ bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" }, // Indigo
] as const;

/**
 * Simple hash function to deterministically assign colors to models
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * Get color for a model based on its identifier
 * Uses deterministic hashing to ensure consistent colors across sessions
 */
export function getModelColor(modelId: string): ModelColor {
	const hash = hashString(modelId);
	const index = hash % MODEL_COLORS.length;
	return MODEL_COLORS[index]!;
}

/**
 * Get all available colors
 */
export function getAllColors(): readonly ModelColor[] {
	return MODEL_COLORS;
}
