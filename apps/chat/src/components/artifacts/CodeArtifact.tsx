import { FC, useState } from "react";
import type { Artifact } from "effect-artifact";
import { Highlight, themes } from "prism-react-renderer";
import { Copy, Check } from "lucide-react";

interface CodeArtifactProps {
	readonly artifact: Artifact;
}

/**
 * CodeArtifact - Renders code blocks with syntax highlighting
 */
export const CodeArtifact: FC<CodeArtifactProps> = ({ artifact }) => {
	const [copied, setCopied] = useState(false);

	if (artifact.type.category !== "code") {
		return null;
	}

	const language =
		artifact.type.language && artifact.type.language !== "text"
			? artifact.type.language
			: "text";

	const handleCopy = () => {
		navigator.clipboard.writeText(artifact.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
			<div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
				<span className="text-sm font-mono text-gray-600">{language}</span>
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
			<Highlight theme={themes.github} code={artifact.content} language={language as any}>
				{({ className, style, tokens, getLineProps, getTokenProps }) => (
					<pre className={`${className} p-4 overflow-x-auto`} style={style}>
						{tokens.map((line, i) => {
							const { key, ...lineProps } = getLineProps({ line, key: i });
							return (
								<div key={key} {...lineProps} className="flex">
									<span className="select-none pr-4 text-gray-500 w-12 text-right">
										{i + 1}
									</span>
									<div className="flex-1">
										{line.map((token, key) => {
											const { key: tokenKey, ...tokenProps } = getTokenProps({
												token,
												key,
											});
											return <span key={tokenKey} {...tokenProps} />;
										})}
									</div>
								</div>
							);
						})}
					</pre>
				)}
			</Highlight>
		</div>
	);
};
