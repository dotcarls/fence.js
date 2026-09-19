---
id: FJ-0008
title: 'Agentic toolchain and SDLC governance scaffold'
type: story
status: done
priority: p0
milestone: '2.0.0'
created: 2026-09-16
updated: 2026-09-16
parent: FJ-0001
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: 'CLAUDE.md, docs/INDEX.md and the toolchain documents exist and every document is reachable from the index'
    satisfied: true
    evidence: docs/INDEX.md
    verified_by: 'reachability gate'
  - text: 'Work items, ADRs and the checkpoint have schemas and a gate suite runs on edit, on commit and in CI'
    satisfied: true
    evidence: tools/gates/cli.ts
    verified_by: 'npm run gates; test/toolchain/gates.test.ts'
  - text: 'The metamodel, ontology, taxonomy and lexicon are documented, mirrored in machine files and enforced where enforceable'
    satisfied: true
    evidence: docs/toolchain/ontology.md
    verified_by: 'generated, binding and lexicon gates'
  - text: 'The architecture and the lifecycle are documented under the same governance'
    satisfied: true
    evidence: docs/architecture/overview.md
    verified_by: 'schemas and reachability gates'
  - text: 'Hooks, skills and agent definitions exist and are documented'
    satisfied: true
    evidence: docs/toolchain/agents-and-skills.md
    verified_by: human
links:
  code: [tools/gates/cli.ts, tools/gates/gates.ts, .claude/settings.json]
  docs:
    [
      docs/toolchain/README.md,
      docs/toolchain/sdlc.md,
      docs/toolchain/metamodel.md,
      docs/toolchain/ontology.md,
      docs/toolchain/taxonomy.md,
      docs/toolchain/lexicon.md,
    ]
  tests: [test/toolchain/gates.test.ts]
  adrs: [ADR-0006, ADR-0007]
---

# FJ-0008 — Agentic toolchain and SDLC governance scaffold

## Description

The owner asked to initialize the agentic toolchain and documentation content sets; establish a canonical metamodel, ontology, taxonomy and lexicon; define an idiomatic way to define, track and orchestrate work through a simple standard lifecycle that is version controlled and aligned with agentic development practice; and document the architecture and toolchain under that governance, taking the tone.togthr toolchain as the reference. Implements ADR-0006 and ADR-0007.

## Notes

- 2026-09-16: done in the same session that removed the compatibility surface.
