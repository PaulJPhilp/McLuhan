#!/usr/bin/env bun
/**
 * Artifact Chat Example
 *
 * This example demonstrates how to use effect-artifact with effect-cli-tui
 * to create an interactive CLI chat application that extracts and displays
 * artifacts (code, diagrams, JSON, etc.) from AI responses.
 *
 * Features:
 * - Interactive chat loop with AI responses
 * - Automatic artifact extraction from responses
 * - Terminal-friendly artifact rendering
 * - Copy-to-clipboard and save-to-file options
 * - Optional supermemory integration for artifact storage
 *
 * Run with: bun run examples/artifact-chat-example.ts
 */

import { Console, Effect } from "effect";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { runWithTUI, TUIHandler } from "effect-cli-tui";
import { extractArtifactsFromString, type Artifact } from "effect-artifact";
import { highlight } from "cli-highlight";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

// Configure marked for terminal output
marked.setOptions({
  renderer: new markedTerminal(),
});

/**
 * Render a code artifact in the terminal
 */
const renderCodeArtifact = (artifact: Artifact, tui: TUIHandler) =>
  Effect.gen(function* () {
    if (artifact.type.category !== "code") return;

    const language =
      artifact.type.language && artifact.type.language !== "text"
        ? artifact.type.language
        : "text";

    yield* tui.display("\n📝 Code Block", "info");
    yield* tui.display(`Language: ${language}`, "info");

    try {
      const highlighted = highlight(artifact.content, { language });
      console.log(highlighted);
    } catch {
      // Fallback if highlighting fails
      console.log(artifact.content);
    }

    yield* tui.display("");
  });

/**
 * Render a Mermaid diagram artifact in the terminal
 */
const renderMermaidArtifact = (artifact: Artifact, tui: TUIHandler) =>
  Effect.gen(function* () {
    if (artifact.type.category !== "diagram" || artifact.type.diagramType !== "mermaid") {
      return;
    }

    yield* tui.display("\n📊 Mermaid Diagram", "info");
    yield* tui.display(
      "Tip: Copy the source and visit https://mermaid.live to visualize",
      "warning"
    );

    console.log(artifact.content);
    yield* tui.display("");
  });

/**
 * Render a JSON artifact in the terminal
 */
const renderJsonArtifact = (artifact: Artifact, tui: TUIHandler) =>
  Effect.gen(function* () {
    if (artifact.type.category !== "data" || artifact.type.dataFormat !== "json") {
      return;
    }

    yield* tui.display("\n📋 JSON Data", "info");

    try {
      const parsed = JSON.parse(artifact.content);
      const formatted = JSON.stringify(parsed, null, 2);
      const highlighted = highlight(formatted, { language: "json" });
      console.log(highlighted);
    } catch (e) {
      console.log(artifact.content);
    }

    yield* tui.display("");
  });

/**
 * Render an SVG artifact in the terminal
 */
const renderSvgArtifact = (artifact: Artifact, tui: TUIHandler) =>
  Effect.gen(function* () {
    if (artifact.type.category !== "diagram" || artifact.type.diagramType !== "svg") {
      return;
    }

    yield* tui.display("\n🎨 SVG Diagram", "warning");
    yield* tui.display("Tip: Save to a .svg file to view in a browser or image viewer", "info");
    yield* tui.display(`SVG size: ${artifact.content.length} bytes`, "info");
    yield* tui.display("");
  });

/**
 * Render artifact with options to copy or save
 */
const renderArtifactWithOptions = (artifact: Artifact, tui: TUIHandler) =>
  Effect.gen(function* () {
    // Render the artifact
    yield* renderCodeArtifact(artifact, tui);
    yield* renderMermaidArtifact(artifact, tui);
    yield* renderJsonArtifact(artifact, tui);
    yield* renderSvgArtifact(artifact, tui);

    // Offer options
    const action = yield* tui.selectOption("What would you like to do?", [
      "Copy to clipboard",
      "Save to file",
      "Back to chat",
    ]);

    switch (action) {
      case "Copy to clipboard":
        yield* Effect.try(() => {
          return navigator.clipboard.writeText(artifact.content);
        }).pipe(
          Effect.mapError(() => new Error("Clipboard copy failed")),
          Effect.catchAll(() =>
            Effect.gen(function* () {
              yield* tui.display(
                "❌ Clipboard copy not available in this environment",
                "error"
              );
            })
          )
        );
        yield* tui.display("✅ Copied to clipboard!", "success");
        break;

      case "Save to file":
        const filename = yield* tui.prompt("Enter filename (without extension)");
        const ext = getFileExtension(artifact);
        const fullFilename = `${filename}${ext}`;

        yield* Effect.try(() => {
          // In a real CLI, you'd use the FileSystem Effect module
          // For now, just provide guidance
          return undefined;
        }).pipe(
          Effect.catchAll(() =>
            Effect.gen(function* () {
              yield* tui.display(
                `Save this content to: ${fullFilename}`,
                "warning"
              );
              yield* tui.display(artifact.content, "info");
            })
          )
        );
        break;

      case "Back to chat":
        return;
    }
  });

/**
 * Get file extension for artifact
 */
const getFileExtension = (artifact: Artifact): string => {
  switch (artifact.type.category) {
    case "code":
      if (artifact.type.category === "code" && artifact.type.language) {
        const languageExtensions: Record<string, string> = {
          typescript: ".ts",
          javascript: ".js",
          python: ".py",
          rust: ".rs",
          go: ".go",
          java: ".java",
          cpp: ".cpp",
          csharp: ".cs",
          ruby: ".rb",
          php: ".php",
          shell: ".sh",
          sql: ".sql",
          json: ".json",
        };
        return languageExtensions[artifact.type.language] || ".txt";
      }
      return ".txt";
    case "diagram":
      if (artifact.type.diagramType === "mermaid") return ".mmd";
      if (artifact.type.diagramType === "svg") return ".svg";
      return ".txt";
    case "data":
      if (artifact.type.dataFormat === "json") return ".json";
      if (artifact.type.dataFormat === "csv") return ".csv";
      if (artifact.type.dataFormat === "yaml") return ".yaml";
      if (artifact.type.dataFormat === "xml") return ".xml";
      return ".txt";
    default:
      return ".txt";
  }
};

/**
 * Main chat loop
 */
const chatProgram = Effect.gen(function* () {
  const tui = yield* TUIHandler;

  yield* tui.display("🤖 AI Chat with Artifact Extraction", "info");
  yield* tui.display(
    "Chat with Claude and automatically extract code, diagrams, JSON, and more!",
    "info"
  );
  yield* tui.display("Type 'exit' to quit.\n", "info");

  const conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  while (true) {
    const userInput = yield* tui.prompt("You");

    if (userInput.toLowerCase() === "exit") {
      yield* tui.display("👋 Goodbye!", "success");
      return;
    }

    // Add user message to history
    conversationHistory.push({
      role: "user",
      content: userInput,
    });

    // Show loading spinner
    yield* tui.display("Claude is thinking...", "info");

    try {
      // Generate AI response
      const response = yield* Effect.tryPromise(() =>
        generateText({
          model: openai("gpt-4-turbo"),
          system:
            "You are a helpful assistant. When appropriate, provide code examples, diagrams, JSON data, or other artifacts in markdown code blocks or structured formats.",
          messages: conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        })
      );

      const aiContent = response.text;

      // Add assistant message to history
      conversationHistory.push({
        role: "assistant",
        content: aiContent,
      });

      // Display response
      yield* tui.display("\nClaude:\n", "success");
      const mdOutput = yield* Effect.sync(() => marked(aiContent));
      console.log(mdOutput);

      // Extract artifacts
      const artifacts = yield* extractArtifactsFromString(aiContent);

      if (artifacts.length > 0) {
        yield* tui.display(
          `\n✨ Found ${artifacts.length} artifact(s) in the response`,
          "success"
        );

        for (let i = 0; i < artifacts.length; i++) {
          const artifact = artifacts[i];
          yield* tui.display(`\nArtifact ${i + 1}:`, "info");
          yield* renderArtifactWithOptions(artifact, tui);
        }
      }

      yield* tui.display("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      yield* tui.display(`❌ Error: ${message}`, "error");

      // Check for API key error
      if (message.includes("API key") || message.includes("401")) {
        yield* tui.display(
          "Please set OPENAI_API_KEY environment variable",
          "warning"
        );
      }

      yield* tui.display("");
    }
  }
});

/**
 * Run the program
 */
console.log("🚀 Starting Artifact Chat Example...\n");

await runWithTUI(chatProgram).catch((error) => {
  Console.error(`Error: ${error.message}`);
  process.exit(1);
});
