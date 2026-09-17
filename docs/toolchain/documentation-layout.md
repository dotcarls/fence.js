---
title: Documentation layout (progressive disclosure)
doc_type: toolchain
status: living
---

# Documentation layout

## Shape

```
CLAUDE.md                     thin, always loaded: rules + 3 pointers
└── docs/INDEX.md             graph root: one table per area, links to area indexes
    ├── docs/toolchain/       how the repository works; the governed vocabulary
    ├── docs/work/            tracker: README (generated index) + CHECKPOINT + items/
    ├── docs/adr/             decisions: README (generated index) + ADR-NNNN-*.md
    ├── docs/architecture/    the library's structure and invariants
    ├── docs/design/          dated design records (historical; ADRs are authoritative)
    └── docs/releases/        how versions, changelog and items bind
README.md · MIGRATING.md · CHANGELOG.md · CONTRIBUTING.md   package documents, linked from INDEX
```

## Rules

- **One root.** `docs/INDEX.md` (plus `CLAUDE.md`) is where the `reachability` gate starts. A
  document it cannot reach by following links does not exist to an agent, and the gate says so.
- **Front matter on every document under `docs/`.** `title`, `doc_type` and `status` are
  mandatory; the applicable schema is chosen by path ([gates](gates.md#schemas)). The values are
  closed sets listed in the [taxonomy](taxonomy.md).
- **Links are relative Markdown links** and are checked, `#anchors` included. Bare ids
  `FJ-NNNN` / `ADR-NNNN` are checked tokens: write them bare when the id is the point, link when
  the reader should jump.
- **Generated blocks** (`<!-- BEGIN GENERATED: name -->` … `<!-- END GENERATED: name -->`) are
  rendered from front matter or from the machine files in `tools/`. Never edit inside the
  markers; run `npm run gates:fix`.
- **Size discipline.** `CLAUDE.md` stays under about 60 lines; indexes are tables, not prose;
  depth goes into leaf documents.
- **Spelling and terms** follow the [lexicon](lexicon.md); the `lexicon` gate enforces the
  spelling table.

## Reading strategy for agents

1. `CLAUDE.md` (automatic) → 2. `docs/work/CHECKPOINT.md` → 3. the area index for the task →
4. the leaf documents it names → 5. the work item(s) it names. Stop when the question is
answered; do not bulk-load areas you are not working in.
