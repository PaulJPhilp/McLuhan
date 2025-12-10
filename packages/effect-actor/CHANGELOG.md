# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-11-27

### Minor Changes

- **BREAKING:** Removed xState as a runtime dependency. The library now uses a custom, Effect-native state machine executor. This significantly reduces the bundle size and improves performance.
- The `createActorSpec` function now performs more robust validation of the state machine definition using `Effect.Schema`.

### Added

- A new `validator.ts` module for state machine specification validation.

### Removed

- The `executor.ts` module, which was previously used to wrap the xState machine.

## [0.1.0] - 2025-11-03

### Added

- Initial release of effect-actor
- Effect-native state machine orchestration framework
- Actor service with state persistence and audit trails
- State machine specification builder with guards and actions
- Storage and compute provider interfaces
- Content production workflow example
- Comprehensive test suite
- TypeScript declarations and ES modules support

### Features

- Hierarchical state machines with entry/exit actions
- Guard conditions for state transitions
- Action execution during transitions
- Schema validation with Effect.Schema
- Audit trail recording
- Actor state persistence
- Effect service integration
- Type-safe actor specifications

### Dependencies

- Effect ^3.18.4 (peer dependency)
