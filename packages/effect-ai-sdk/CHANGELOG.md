# Changelog

All notable changes to effect-ai-sdk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-12-10

### Security
- Updated Vercel AI SDK from v5.0.0 to v5.0.109 (includes CVE-2025-48985 fix)

### Added
- Initial release with Effect-native AI SDK wrapper
- Support for 8 AI providers (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen)
- Core operations: generateText, generateObject, generateEmbeddings, generateImages, generateAudio, transcribeAudio
- Streaming operations: streamText, streamObject with provider-specific adapters
- Tool calling system with orchestration loops and built-in `fetchContent` tool
- Message transformation utilities with bidirectional Effect ↔ Vercel format conversion
- Functional library pattern (not Effect.Service) for maximum flexibility
- Effect-native error handling with Data.TaggedError discriminated unions
- Comprehensive provider factory for instantiating all 8 AI providers
- Schema conversion utilities for Effect.Schema, Zod, and JSON Schema

### Fixed
- Improved streaming error handling in stream consumption
- Better abort signal support in Effect operations
- Enhanced zero-length text part handling in message transformation

### Changed
- Updated `ai` package to ^5.0.109 for security and stability improvements
- Updated provider packages to latest patch versions within v1.x series
- @ai-sdk/deepseek: ^0.2.16 (from ^0.2.14)
- @ai-sdk/google: ^1.2.22 (from ^1.2.19)
- @ai-sdk/openai: ^1.3.24 (from ^1.3.22)
- @ai-sdk/xai: ^1.2.18 (from ^1.2.16)

### Notes
- Provider packages v2.x available but not adopted to minimize breaking changes
- Zod v4 available but staying on v3.x for tool compatibility
- All existing tests passing
- TypeScript strict mode enabled with `exactOptionalPropertyTypes: true`
