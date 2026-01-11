import { FC } from "react";
import type { Artifact } from "effect-artifact";

interface SvgArtifactProps {
	readonly artifact: Artifact;
}

/**
 * SvgArtifact - Renders SVG diagrams
 */
export const SvgArtifact: FC<SvgArtifactProps> = ({ artifact }) => {
	if (
		artifact.type.category !== "diagram" ||
		artifact.type.diagramType !== "svg"
	) {
		return null;
	}

	return (
		<div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-white p-4">
			<div className="flex justify-center items-center bg-gray-50 rounded p-4 min-h-64">
				<div
					dangerouslySetInnerHTML={{ __html: artifact.content }}
					className="w-full max-w-2xl"
				/>
			</div>
		</div>
	);
};
