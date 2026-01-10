import { FC, useEffect, useRef, useState } from "react";
import type { Artifact } from "effect-artifact";
import mermaid from "mermaid";

interface MermaidArtifactProps {
	readonly artifact: Artifact;
}

/**
 * MermaidArtifact - Renders Mermaid diagrams
 */
export const MermaidArtifact: FC<MermaidArtifactProps> = ({ artifact }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	if (artifact.type.category !== "diagram" || artifact.type.diagramType !== "mermaid") {
		return null;
	}

	useEffect(() => {
		const renderDiagram = async () => {
			if (!containerRef.current) return;

			try {
				setError(null);
				// Initialize mermaid with desired config
				mermaid.initialize({
					startOnLoad: true,
					theme: "default",
					securityLevel: "loose",
				});

				const id = `mermaid-${artifact.id}`;
				const { svg } = await mermaid.render(id, artifact.content);

				if (containerRef.current) {
					containerRef.current.innerHTML = svg;
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				setError(`Failed to render diagram: ${message}`);
				console.error("Mermaid rendering error:", err);
			}
		};

		renderDiagram();
	}, [artifact.content, artifact.id]);

	return (
		<div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-white p-4">
			{error ? (
				<div className="p-4 rounded bg-red-50 text-red-900 text-sm">
					<p className="font-semibold mb-2">Diagram Error</p>
					<p className="font-mono text-xs">{error}</p>
					<details className="mt-4">
						<summary className="cursor-pointer text-xs font-semibold mb-2">
							Show diagram source
						</summary>
						<pre className="bg-red-100 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words">
							{artifact.content}
						</pre>
					</details>
				</div>
			) : (
				<div
					ref={containerRef}
					className="flex justify-center items-center"
					style={{ minHeight: "200px" }}
				/>
			)}
		</div>
	);
};
