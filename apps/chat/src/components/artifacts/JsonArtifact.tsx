import { FC, useMemo, useState } from "react";
import type { Artifact } from "effect-artifact";
import { JSONTree } from "react-json-tree";
import { Copy, Check } from "lucide-react";

interface JsonArtifactProps {
	readonly artifact: Artifact;
}

/**
 * JsonArtifact - Renders JSON data with collapsible tree view
 */
export const JsonArtifact: FC<JsonArtifactProps> = ({ artifact }) => {
	const [copied, setCopied] = useState(false);

	if (
		artifact.type.category !== "data" ||
		artifact.type.dataFormat !== "json"
	) {
		return null;
	}

	const data = useMemo(() => {
		try {
			return JSON.parse(artifact.content);
		} catch (e) {
			return { error: "Invalid JSON", raw: artifact.content };
		}
	}, [artifact.content]);

	const handleCopy = () => {
		navigator.clipboard.writeText(artifact.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-white">
			<div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
				<span className="text-sm font-mono text-gray-600">JSON</span>
				<button
					onClick={handleCopy}
					className="p-1.5 rounded hover:bg-gray-200 transition-colors"
					title={copied ? "Copied!" : "Copy to clipboard"}
				>
					{copied ? (
						<Check className="w-4 h-4 text-green-600" />
					) : (
						<Copy className="w-4 h-4 text-gray-600" />
					)}
				</button>
			</div>
			<div className="p-4 overflow-x-auto bg-gray-50">
				<JSONTree
					data={data}
					theme={{
						scheme: "github",
						author: "Atomix (http://atomix.org/)",
						base00: "#ffffff",
						base01: "#f5f5f5",
						base02: "#c8c8fa",
						base03: "#969896",
						base04: "#e8e8e8",
						base05: "#333333",
						base06: "#ffffff",
						base07: "#ffffff",
						base08: "#ed6a43",
						base09: "#0086b3",
						base0A: "#795da3",
						base0B: "#183691",
						base0C: "#183691",
						base0D: "#0086b3",
						base0E: "#a71d5d",
						base0F: "#333333",
					}}
					invertTheme={false}
					hideRoot={false}
					shouldExpandNodeInitially={() => false}
					keyPath={[]}
				/>
			</div>
		</div>
	);
};
