# 1. Modular monolith on Payload + Next.js

Date: 2026-10-11 · Status: accepted

**Decision.** One Next.js app with Payload 3 inside it serves every salon. Features are modules in `packages/modules`, registered in one list. Modules talk only through events.

**Why.** One deployment, one schema, no service mesh. Payload gives auth, admin, API, uploads, versions and migrations for free. The registry means adding or removing a feature is one line, and the event bus means features don't break each other.

**Consequences.** A module can later be split into its own service because it already has no code dependencies on other modules.
