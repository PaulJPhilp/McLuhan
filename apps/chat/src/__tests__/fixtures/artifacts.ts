import type { Artifact } from "effect-artifact";

/**
 * Test fixtures for artifacts
 */

/**
 * Create a test code artifact
 */
export function createTestCodeArtifact(
	overrides?: Partial<Artifact>,
): Artifact {
	return {
		id: crypto.randomUUID(),
		type: { category: "code", language: "typescript" },
		content: `function example() {
  console.log("Hello, World!");
  return 42;
}`,
		metadata: {
			title: "Example Function",
			tags: ["example", "test"],
			version: "1.0.0",
			created: new Date(),
			updated: new Date(),
		},
		...overrides,
	};
}

/**
 * Create a test Mermaid diagram artifact
 */
export function createTestMermaidArtifact(
	overrides?: Partial<Artifact>,
): Artifact {
	return {
		id: crypto.randomUUID(),
		type: { category: "diagram", diagramType: "mermaid" },
		content: `graph LR
  A[Start] --> B[Process]
  B --> C{Decision}
  C -->|Yes| D[End]
  C -->|No| B`,
		metadata: {
			title: "Example Flowchart",
			tags: ["diagram", "flowchart"],
		},
		...overrides,
	};
}

/**
 * Create a test JSON artifact
 */
export function createTestJsonArtifact(
	overrides?: Partial<Artifact>,
): Artifact {
	return {
		id: crypto.randomUUID(),
		type: { category: "data", dataFormat: "json" },
		content: JSON.stringify(
			{
				name: "Test User",
				email: "test@example.com",
				age: 30,
				tags: ["test", "fixture"],
			},
			null,
			2,
		),
		metadata: {
			title: "User Data",
			tags: ["json", "data"],
		},
		...overrides,
	};
}

/**
 * Create a test SVG artifact
 */
export function createTestSvgArtifact(overrides?: Partial<Artifact>): Artifact {
	return {
		id: crypto.randomUUID(),
		type: { category: "diagram", diagramType: "svg" },
		content: `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue" />
  <text x="50" y="55" text-anchor="middle" fill="white">Test</text>
</svg>`,
		metadata: {
			title: "SVG Diagram",
			tags: ["svg", "diagram"],
		},
		...overrides,
	};
}

/**
 * Create multiple test artifacts of different types
 */
export function createTestArtifacts(): Artifact[] {
	return [
		createTestCodeArtifact({ id: "artifact-code-1" }),
		createTestMermaidArtifact({ id: "artifact-mermaid-1" }),
		createTestJsonArtifact({ id: "artifact-json-1" }),
		createTestSvgArtifact({ id: "artifact-svg-1" }),
	];
}

/**
 * Create a test artifact of any supported type
 */
export function createTestArtifact(
	type: "code" | "mermaid" | "json" | "svg",
	overrides?: Partial<Artifact>,
): Artifact {
	switch (type) {
		case "code":
			return createTestCodeArtifact(overrides);
		case "mermaid":
			return createTestMermaidArtifact(overrides);
		case "json":
			return createTestJsonArtifact(overrides);
		case "svg":
			return createTestSvgArtifact(overrides);
	}
}
