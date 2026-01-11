---
"effect-actor": patch
---

Refactored ActorService and AuditLog to improve testability and isolation. Dependencies are now correctly overridable in tests by separating implementation from default wiring. Moved SpecRegistry state inside the layer construction to prevent global state leaks between tests. Added proper failing default for StorageProvider to avoid silent failures.
