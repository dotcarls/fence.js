---
id: FJ-0022
title: 'CodeQL js/incomplete-sanitization in the ontology table generator stops 2.0.1'
type: bug
status: done
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0024]
blocked_by: []
acceptance_criteria:
  - text: 'The CI finding is reproduced locally before the fix: npm run codeql on the unfixed tree reports js/incomplete-sanitization at tools/gates/generate.ts:153 and exits 1'
    satisfied: true
    evidence: 'docs/work/items/FJ-0022-codeql-js-incomplete-sanitization-in-the-ontology-table-gene.md#notes'
    verified_by: 'scripts/codeql.mjs on a worktree of 6cb6613, CodeQL 2.27.0, codeql/javascript-queries@2.4.5'
  - text: 'The ontology and taxonomy documents show every target pattern byte for byte, including \| and backtick runs; what Markdown would normalize (carriage returns, NUL, edge spaces in a pattern) is refused, not mangled'
    satisfied: true
    evidence: 'test/toolchain/generate.test.ts'
    verified_by: "vitest: codeBlock round-trips regexes, escaped pipes, backslashes, Markdown syntax, backtick runs and fence lines under CommonMark's closing-fence rule; a fixed three-backtick fence fails two cases"
  - text: 'npm run codeql reports no finding on the fixed tree'
    satisfied: true
    evidence: 'docs/work/items/FJ-0022-codeql-js-incomplete-sanitization-in-the-ontology-table-gene.md#notes'
    verified_by: 'npm run codeql: 0 findings'
  - text: 'The generated blocks are regenerated and every gate passes'
    satisfied: true
    evidence: 'docs/toolchain/ontology.md'
    verified_by: 'npm run gates:fix, then npm run gates: PASS'
links:
  code: [tools/gates/generate.ts]
  docs: [docs/toolchain/ontology.md, docs/toolchain/taxonomy.md]
  tests: [test/toolchain/generate.test.ts]
  adrs: [ADR-0012]
---

# FJ-0022 — CodeQL js/incomplete-sanitization in the ontology table generator stops 2.0.1

## Description

CodeQL reported `js/incomplete-sanitization` at `tools/gates/generate.ts:153` in CI run
35448397531 on `main` and run 35448397495 on `v2.0.1`. The ontology kinds table escaped `|` in
regex target patterns but not backslashes. CodeQL was the only failing job on both runs, so
Pages did not deploy and 2.0.1 was not published.

## Notes

- 2026-09-19: created. The acceptance criteria were written after the fix was drafted, before any
  of it was verified.
- 2026-09-19: the finding is real, not an analyzer quirk. A GFM table cell cannot hold an arbitrary
  pattern faithfully:
  - GFM splits the row on `|` before inline parsing.
  - It honors `\|` even inside a code span.
  - A code span takes no other escape.

  So a pattern holding `\|` has no correct spelling in a cell. Escaping backslashes too, which is
  what the rule asks for, would show `\\d` for `\d`. The patterns now appear in a fenced code
  block under the table. A fence needs no escape, only one longer than any run of backticks
  inside it.

- 2026-09-19: reproduced with `scripts/codeql.mjs` (FJ-0023) on a worktree of 6cb6613, before the
  fix:

  ```text
  codeql: 138 files, CodeQL 2.27.0, codeql/javascript-queries@2.4.5
  codeql: js/incomplete-sanitization at tools/gates/generate.ts:153: This does not escape backslash characters in the input.
  codeql: 1 finding
  exit=1
  ```

  After the fix, the same command reports `codeql: 0 findings` and exits 0.

- 2026-09-19: review (fence-reviewer) of dbd8fa8. It confirmed the rendering with markdown-it and
  marked, and found the test helper laxer than CommonMark and the byte-for-byte claim untrue for
  carriage returns and NUL. Fixed: the helper applies the closing-fence rule, `codeBlock`
  refuses carriage returns and NUL, and a pattern with edge spaces is refused. Done.
