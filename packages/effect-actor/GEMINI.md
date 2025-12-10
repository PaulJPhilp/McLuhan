# GEMINI - Your AI Assistant's Guide to `effect-actor`

This document provides context for AI assistants to understand and interact with the `effect-actor` project.

## Project Overview

`effect-actor` is a powerful, type-safe actor orchestration framework built natively for the [Effect](https://effect.website/) ecosystem. It brings the proven statechart model of [xState](https://xstate.js.org/) to Effect with zero external dependencies.

The project is a TypeScript monorepo managed with `bun` and `turbo`. It follows a layered architecture, with a clear separation of concerns between the public API, specification, state machine execution, and provider layers.

**Key Technologies:**

*   **Language:** TypeScript
*   **Framework:** Effect-TS
*   **Build System:** turbo
*   **Package Manager:** bun
*   **Testing:** vitest
*   **Linting/Formatting:** biome

## Building and Running

The following commands are available from the root of the monorepo:

*   **Install dependencies:**
    ```bash
    bun install
    ```
*   **Run tests:**
    ```bash
    bun test
    ```
*   **Build the project:**
    ```bash
    bun run build
    ```
*   **Lint the project:**
    ```bash
    bun run lint
    ```
*   **Format the project:**
    ```bash
    bun run format
    ```

## Development Conventions

*   **Monorepo Structure:** The project is a monorepo with the main package located in `packages/effect-actor`.
*   **Effect-Native:** The project is built to be "Effect-native," meaning it leverages the functional programming model of Effect-TS. It has its own custom state machine executor and does not use the xState runtime.
*   **Layered Architecture:** The codebase is organized into layers:
    1.  **Public API Layer:** `src/actor/service.ts`, `src/actor/wrapper.ts`
    2.  **Specification & Validation Layer:** `src/spec/`
    3.  **State Machine Execution Layer:** `src/machine/`
    4.  **Provider Layer:** `src/providers/`
*   **Testing:** Tests are written with `vitest` and are located in the `src/__tests__` directory within the `effect-actor` package.
*   **Linting and Formatting:** The project uses `biome` for linting and formatting. Configuration can be found in `biome.jsonc` and `packages/effect-actor/biome.jsonc`.
*   **Committing:** The project uses `husky` and `lint-staged` to run checks before committing.
