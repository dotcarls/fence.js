---
id: ADR-0003
title: 'Serialization format 2: one JSON document with tagged nested fences, validated on the way in'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [serialization, format, compatibility]
supersedes: null
superseded_by: null
related: []
---

# ADR-0003 — Serialization format 2: one JSON document with tagged nested fences, validated on the way in

## Context

1.x serialized a builder as a JSON array of JSON strings (double encoding), dropped fences that
appeared inside step arguments (they became plain objects and failed on rehydration), and
reported only the first missing validator name.

## Options considered

| Option                                                                        | Pros                                                                   | Cons                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| One versioned JSON document, nested fences tagged, strict validation on parse | Normal JSON; round-trips nested fences; every problem reported at once | A reserved key (`$fence`) in user data                       |
| Keep the 1.x string-of-strings                                                | No migration                                                           | Cannot carry nested fences; not a JSON document of the fence |
| A binary or custom text format                                                | Compact                                                                | Nothing else reads it; JSON is the point of the feature      |

## Decision

`toJSON()` on a builder or fence produces `{ "fence": 2, "steps": [{ "name", "args" }] }`.
Commitments:

- **`serialize.json-only`** — only JSON values and fences may appear in step arguments. A fence
  in an argument serializes as `{ "$fence": <document> }`; a user object that has a `$fence` key,
  a function, `undefined`, a non-finite number, a `Date`, a class instance, a sparse array or a
  cycle throws `SerializationError` naming the path. `Result.toJSON()` uses a lenient mode that
  describes such values as strings instead, because it is diagnostics.
- **`hydrate.validate-everything`** — `FenceBuilder.fromJSON(json, base)` accepts a JSON string,
  a parsed object, or a live fence or builder; validates the version, the step shape and every
  argument (nested fences included; a `$fence` object must have exactly that one key and a
  non-empty step list); collects every step name including nested ones and throws one
  `HydrationError` whose `missing` lists every unregistered name; then revives nested fences
  against `base`. `base` is a builder (its options apply) or a plain registry (validated like
  `registerAll`).
- Format version `2` is the only version read. The 1.x format is not read
  ([ADR-0005](ADR-0005-no-compatibility-surface-in-2-0.md)); MIGRATING shows the conversion.

## Consequences

`JSON.stringify(fence)` is the wire format; policies of fences round-trip; malformed input is
refused with a path. The `$fence` key is reserved in step arguments.

## Verification

`test/serialize.test.ts`: shape, tagging, every refusal, prototype-pollution safety, and two
property-based round-trip tests judged against `JSON.parse(JSON.stringify(...))` rather than
against the serializer itself.

## Links

FJ-0004 · [MIGRATING](../../MIGRATING.md)
