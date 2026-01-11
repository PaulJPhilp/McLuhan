/**
 * ArtifactExtractionService - Wrapper around effect-artifact extraction
 * Provides a service interface for extracting artifacts from AI responses
 */

import { Effect } from "effect";
// Use relative import through node_modules to work around cross-workspace dependency resolution
import {
	extractArtifactsFromString,
	type Artifact,
} from "../../../../../../Hume/packages/effect-artifact/dist/index.js";

export interface ArtifactExtractionServiceSchema {
	readonly extractFromContent: (
		content: string,
		modelProvider?: string,
		modelId?: string,
	) => Effect.Effect<readonly Artifact[]>;
}

export class ArtifactExtractionService extends Effect.Service<ArtifactExtractionService>()(
	"ArtifactExtractionService",
	{
		effect: Effect.fn(function* () {
			const extractFromContent = (
				content: string,
				modelProvider?: string,
				modelId?: string,
			): Effect.Effect<readonly Artifact[]> => {
				const modelInfo =
					modelProvider && modelId
						? { provider: modelProvider, model: modelId }
						: undefined;

				return extractArtifactsFromString(content, modelInfo);
			};

			return {
				extractFromContent,
			} satisfies ArtifactExtractionServiceSchema;
		}),
	},
) {}
