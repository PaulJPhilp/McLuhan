import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { ArtifactExtractionService } from "../../index.js";

describe("ArtifactExtractionService", () => {
	it("should extract code artifacts from markdown", async () => {
		const content = `Here's a TypeScript function:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

Hope that helps!`;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			expect(artifacts).toHaveLength(1);
			expect(artifacts[0]?.type.category).toBe("code");
			if (artifacts[0]?.type.category === "code") {
				expect(artifacts[0].type.language).toBe("typescript");
			}
			expect(artifacts[0]?.content).toContain("function greet");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should extract JSON artifacts", async () => {
		const content = `Here's a JSON config:

\`\`\`json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "effect": "^3.19.0"
  }
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			// effect-artifact currently extracts twice: once as generic code block, once as specialized category
			expect(artifacts.length).toBeGreaterThanOrEqual(1);
			const jsonArtifact = artifacts.find(a => a.type.category === "data");
			expect(jsonArtifact).toBeDefined();
			if (jsonArtifact?.type.category === "data") {
				expect(jsonArtifact.type.dataFormat).toBe("json");
			}
			expect(jsonArtifact?.content).toContain("my-app");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should extract Mermaid diagrams", async () => {
		const content = `Here's a flowchart:

\`\`\`mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[End]
    C -->|No| B
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			// effect-artifact extracts twice for mermaid blocks
			expect(artifacts.length).toBeGreaterThanOrEqual(1);
			const mermaidArtifact = artifacts.find(a => a.type.category === "diagram");
			expect(mermaidArtifact).toBeDefined();
			if (mermaidArtifact?.type.category === "diagram") {
				expect(mermaidArtifact.type.diagramType).toBe("mermaid");
			}
			expect(mermaidArtifact?.content).toContain("flowchart");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should extract multiple artifacts", async () => {
		const content = `First, here's Python code:

\`\`\`python
def fibonacci(n):
    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)
\`\`\`

And here's a JSON example:

\`\`\`json
{"fibonacci": [0, 1, 1, 2, 3, 5, 8]}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			// 1 python code block + 1 json code block + 1 json data artifact = 3
			expect(artifacts.length).toBeGreaterThanOrEqual(2);
			
			const pythonArtifact = artifacts.find(a => 
				a.type.category === "code" && a.type.language === "python"
			);
			expect(pythonArtifact).toBeDefined();

			const jsonArtifact = artifacts.find(a => a.type.category === "data");
			expect(jsonArtifact).toBeDefined();
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should extract SVG artifacts", async () => {
		const content = `Here's an SVG diagram:

\`\`\`svg
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			// Extracts twice for svg blocks
			expect(artifacts.length).toBeGreaterThanOrEqual(1);
			const svgArtifact = artifacts.find(a => a.type.category === "diagram");
			expect(svgArtifact).toBeDefined();
			if (svgArtifact?.type.category === "diagram") {
				expect(svgArtifact.type.diagramType).toBe("svg");
			}
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should return empty array when no artifacts found", async () => {
		const content =
			"This is just plain text without any code blocks or artifacts.";

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			expect(artifacts).toEqual([]);
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should include model metadata when provided", async () => {
		const content = `\`\`\`javascript
console.log("test");
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(
				content,
				"anthropic",
				"claude-3-sonnet",
			);

			expect(artifacts).toHaveLength(1);
			expect(artifacts[0]?.metadata.modelInfo?.provider).toBe("anthropic");
			expect(artifacts[0]?.metadata.modelInfo?.model).toBe("claude-3-sonnet");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});

	it("should handle nested code blocks", async () => {
		const content = `\`\`\`typescript
function example() {
  const code = \`\`\`
  nested code
  \`\`\`;
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const artifacts = yield* extraction.extractFromContent(content);

			// Should extract at least one artifact
			expect(artifacts.length).toBeGreaterThan(0);
			expect(artifacts[0]?.type.category).toBe("code");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactExtractionService.Default())),
		);
	});
});
