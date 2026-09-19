/*
 * The generator writes text into Markdown that readers and agents take literally, so what it
 * renders must read back byte for byte, whatever the text holds.
 */
import { describe, expect, test } from 'vitest';

import { codeBlock } from '../../tools/gates/generate.js';

/** The body of a fenced block, the way CommonMark reads it: between the opening and closing fence. */
function body(block: string): { fence: string; text: string } {
    const lines = block.split('\n');
    const open = /^(`{3,})text$/.exec(lines[0] ?? '');
    expect(open).not.toBeNull();
    const fence = open?.[1] ?? '';
    expect(lines.at(-1)).toBe(fence);
    return { fence, text: lines.slice(1, -1).join('\n') };
}

describe('codeBlock', () => {
    test.each([
        ['a regular expression', String.raw`^ADR-\d{4}(#[a-z0-9-]+)?$`],
        ['an escaped pipe, which no table cell can hold', String.raw`^(a\|b)\\|c$`],
        ['backslashes before punctuation', String.raw`\. \* \_ \[ \] \\`],
        ['Markdown and HTML syntax', '*a* _b_ [c](d) <e> &amp; ~~f~~ | g'],
        ['several lines', 'first\nsecond'],
    ])('shows %s unchanged', (_, text) => {
        expect(body(codeBlock(text)).text).toBe(text);
    });

    test('uses a fence longer than any run of backticks in the text', () => {
        const text = 'one ` three ``` five `````';
        const { fence, text: shown } = body(codeBlock(text));
        expect(fence).toBe('``````');
        expect(shown).toBe(text);
    });

    test('uses the shortest fence CommonMark allows when the text has no backticks', () => {
        expect(body(codeBlock('plain')).fence).toBe('```');
    });
});
