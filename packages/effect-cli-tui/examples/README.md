# Running Examples

## Quick Test

Verify examples work:

```bash
bun run examples/test-example.ts
```

## Available Examples

- **`basic-prompts.tsx`** - Basic interactive prompts (Input, Select, Confirm, Password)
- **`multi-step-wizard.tsx`** - Complex multi-step workflow with validation
- **`error-handling.ts`** - Comprehensive error handling patterns (reference/documentation - examples are commented out)
- **`progress-demo.tsx`** - Spinner and progress bar demonstrations
- **`tables-and-boxes.ts`** - Demonstrates how to display data in tables and boxes.
- **`spinners.ts`** - A simple example of using spinners for long-running tasks.
- **`theming.ts`** - An interactive example to preview and switch between themes.
- **`prompt-builder.tsx`** - **🏆 Teaching Example**: Advanced prompt builder demonstrating all major library features
- **`artifact-chat-example.ts`** - **🎨 AI Artifact Demo**: Interactive CLI chat with Claude that extracts and displays code, diagrams, JSON, and more from AI responses
- **`supermemory-example.ts`** - Integration with Supermemory for persistent memory storage and search

## The Prompt Builder - Comprehensive Teaching Example

The **`prompt-builder.tsx`** example serves as the primary educational resource for learning how to use **effect-cli-tui**. It demonstrates:
- ✅ **Template-based Architecture** - How to structure complex CLI applications
- ✅ **Interactive Components** - Input, Select, Confirm with validation
- ✅ **Display Utilities** - Panels, boxes, tables, and colored output
- ✅ **Effect.Service Pattern** - Dependency injection and service composition
- ✅ **Schema Validation** - Type-safe data validation with Effect Schema
- ✅ **Error Handling** - Comprehensive error patterns with catchTag
- ✅ **Clipboard Integration** - Cross-platform clipboard operations
- ✅ **Iterative Workflows** - Edit/regenerate patterns for refinement

**Start here** to understand the full capabilities of effect-cli-tui!

### Using `bun` (Recommended)

```bash
bun run examples/basic-prompts.tsx
bun run examples/multi-step-wizard.tsx
bun run examples/progress-demo.tsx
bun run examples/tables-and-boxes.ts
bun run examples/spinners.ts
bun run examples/theming.ts
bun run examples/prompt-builder.tsx
bun run examples/artifact-chat-example.ts
bun run examples/supermemory-example.ts

# error-handling.ts is a reference file (examples are commented out)
# Uncomment examples in the file to test them individually
```

### Artifact Chat Example

The `artifact-chat-example.ts` demonstrates interactive chat with automatic artifact extraction:

```bash
# Set your OpenAI API key first
export OPENAI_API_KEY=sk_your_key_here

# Run the artifact chat example
bun run examples/artifact-chat-example.ts
```

Once running, you can:
1. Chat with Claude about code, diagrams, JSON data, etc.
2. Ask for specific artifacts (e.g., "Write me a Python function to...")
3. View extracted artifacts with syntax highlighting
4. Copy artifacts to clipboard or save to files
5. View Mermaid diagrams (with link to mermaid.live)

**Example prompts to try:**
- "Write a TypeScript function to sort an array"
- "Create a Mermaid flowchart for a login process"
- "Give me a JSON config example for a web server"
- "Write a Bash backup script"

**Note:** Interactive examples (with prompts) need to run in a terminal with TTY support. They won't work in non-interactive environments.

### Alternative: Using `tsx`

If you prefer tsx:

```bash
npx tsx examples/basic-prompts.tsx
npx tsx examples/multi-step-wizard.tsx
npx tsx examples/progress-demo.tsx
npx tsx examples/prompt-builder.tsx
```

## Example: Running Basic Prompts

```bash
bun run examples/basic-prompts.tsx
```

This will start an interactive prompt session asking for:

- Your name
- Your role (Admin/User/Guest)
- Confirmation to create account
- Password

## Example: Running Error Handling

The `error-handling.ts` file is a **reference/documentation file** with examples that are commented out. It demonstrates error handling patterns but isn't meant to be run directly.

To use the examples:

1. Open `examples/error-handling.ts`
2. Uncomment the example you want to test
3. The examples use `Effect.gen` with `yield*` which requires proper TypeScript compilation
4. Copy the example code into your own script to test it

## Troubleshooting

### "Cannot find module" errors

Make sure you've installed dependencies:

```bash
bun install
```

### Type errors

Ensure the project is built:

```bash
bun run build
```

### Interactive examples not working

Interactive examples require a TTY (terminal). They won't work in:

- CI/CD pipelines without TTY
- Non-interactive shells
- Some IDEs' integrated terminals

Run them in a regular terminal instead.
