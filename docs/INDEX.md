---
title: Documentation index
doc_type: index
status: living
---

# fence.js — documentation index

The single root of the documentation graph. Every governed document must be reachable from
here (the `reachability` gate enforces it). Read only what you need: each row links to a deeper
index or document.

## Start here

| Need                                                         | Go to                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| What is the state of the project right now?                  | [work/CHECKPOINT.md](work/CHECKPOINT.md)                                           |
| What is this project, and what are the rules?                | [../CLAUDE.md](../CLAUDE.md), [architecture/overview.md](architecture/overview.md) |
| How does the toolchain (gates, tracker, hooks, agents) work? | [toolchain/README.md](toolchain/README.md)                                         |
| How does work move from idea to release?                     | [toolchain/sdlc.md](toolchain/sdlc.md)                                             |
| What has been decided, and why?                              | [adr/README.md](adr/README.md)                                                     |
| What do the words mean?                                      | [toolchain/lexicon.md](toolchain/lexicon.md)                                       |
| How is a release cut?                                        | [toolchain/release-process.md](toolchain/release-process.md)                       |

## Areas

### Toolchain and governance — `docs/toolchain/`

- [README](toolchain/README.md) — the agentic toolchain: pieces, principles, daily commands
- [documentation-layout](toolchain/documentation-layout.md) — progressive disclosure and the rules every document follows
- [sdlc](toolchain/sdlc.md) — the lifecycle: work item statuses, definition of ready and done, milestones, branches, releases, and the gate at each transition
- [work-tracking](toolchain/work-tracking.md) — the work item: schema, rules, commands
- [checkpoint-protocol](toolchain/checkpoint-protocol.md) — how sessions hand off
- [gates](toolchain/gates.md) — what each gate checks and how to fix a finding
- [agents-and-skills](toolchain/agents-and-skills.md) — hooks, skills, subagents and how work is routed to them
- [environment](toolchain/environment.md) — required tools and versions
- [release-process](toolchain/release-process.md) — semver, Keep a Changelog, release-it, the tag-triggered publish
- **Vocabulary**
  - [metamodel](toolchain/metamodel.md) — the kinds of governed artifact and the relations between them
  - [ontology](toolchain/ontology.md) — the domain concepts and the code-to-document annotation vocabulary
  - [taxonomy](toolchain/taxonomy.md) — the closed classification sets (statuses, types, categories)
  - [lexicon](toolchain/lexicon.md) — the glossary, canonical terms and spelling

### Work tracking — `docs/work/`

- [README (item index, generated)](work/README.md)
- [CHECKPOINT](work/CHECKPOINT.md)

### Decisions — `docs/adr/`

- [README (ADR index, generated)](adr/README.md)

### Architecture — `docs/architecture/`

- [overview](architecture/overview.md) — modules, the compose → build → run → serialize flow, the type-level design, the named invariants

### Design records — `docs/design/`

- [2026-09-16 — the v2 proposal](design/2026-09-16-v2-proposal.md) — the assessment of 1.x and the approved plan the rewrite followed (historical; the ADRs are authoritative)

### Releases — `docs/releases/`

- [README](releases/README.md) — how the changelog, the version and the work items bind

## Package documents (repository root)

- [README](../README.md) — the user-facing guide, shipped in the npm package
- [MIGRATING](../MIGRATING.md) — 1.x to 2.0, shipped in the package
- [CHANGELOG](../CHANGELOG.md) — Keep a Changelog, shipped in the package
- [CONTRIBUTING](../CONTRIBUTING.md) — setup, scripts, conventions
