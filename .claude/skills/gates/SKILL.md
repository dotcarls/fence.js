---
name: gates
description: Run the repository gate suite (npm run gates), apply the mechanical fixes (generated indexes), and explain every remaining finding with the exact file and edit that resolves it. Use whenever gates fail, before a commit, and before closing a work item.
allowed-tools: Read, Edit, Bash(npm run *), Bash(npx tsx tools/gates/cli.ts *)
---

# /gates

1. `npm run gates:fix` — regenerates the generated blocks (work index, ADR index, ontology,
   taxonomy and lexicon tables), then runs every gate.
2. For each remaining finding, name the minimal edit that resolves it. Never weaken a rule to
   make a finding disappear: fix the artifact, or change `tools/gates.json`, `tools/schemas/`,
   `tools/ontology.json` or `tools/lexicon.json` deliberately and say why in the commit message
   and in [docs/toolchain/gates.md](../../../docs/toolchain/gates.md).
3. `npm test` for the toolchain's own tests (`test/toolchain/`).
4. Report PASS/FAIL with the counts the tool prints.
