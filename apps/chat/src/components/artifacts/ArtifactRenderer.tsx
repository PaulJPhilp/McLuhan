import { FC } from "react";
import type { Artifact } from "effect-artifact";
import { CodeArtifact } from "./CodeArtifact.js";
import { MermaidArtifact } from "./MermaidArtifact.js";
import { JsonArtifact } from "./JsonArtifact.js";
import { SvgArtifact } from "./SvgArtifact.js";

interface ArtifactRendererProps {
	readonly artifact: Artifact;
}

/**
 * ArtifactRenderer - Routes artifacts to the appropriate renderer based on type
 */
export const ArtifactRenderer: FC<ArtifactRendererProps> = ({ artifact }) => {
	switch (artifact.type.category) {
		case "code":
			return <CodeArtifact artifact={artifact} />;

		case "diagram":
			if (artifact.type.diagramType === "mermaid") {
				return <MermaidArtifact artifact={artifact} />;
			}
			if (artifact.type.diagramType === "svg") {
				return <SvgArtifact artifact={artifact} />;
			}
			return (
				<div className="p-4 rounded bg-yellow-50 text-yellow-900">
					Unsupported diagram type: {artifact.type.diagramType}
				</div>
			);

		case "data":
			if (artifact.type.dataFormat === "json") {
				return <JsonArtifact artifact={artifact} />;
			}
			return (
				<div className="p-4 rounded bg-yellow-50 text-yellow-900">
					Unsupported data format: {artifact.type.dataFormat}
				</div>
			);

		case "document":
		case "media":
		case "markup":
		case "configuration":
			return (
				<div className="p-4 rounded bg-blue-50 text-blue-900">
					Artifact type "{artifact.type.category}" rendering not yet implemented
				</div>
			);

		default:
			const _exhaustive: never = artifact.type;
			return _exhaustive;
	}
};
