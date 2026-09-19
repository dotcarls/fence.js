/*
 * The generator writes text into Markdown that readers and agents take literally, so what it
 * renders must read back byte for byte, whatever the text holds, short of the carriage returns
 * and NUL that Markdown itself normalizes (refused instead).
 */
import { describe, expect, test } from 'vitest';

import { codeBlock } from '../../tools/gates/generate.js';

/**
 * The body of a fenced block, the way CommonMark reads it (4.5): the block ends at the first line
 * that is a closing fence, up to three spaces of indentation, at least as many backticks as the
 * opening fence and nothing after them but spaces. That line must be the last one.
 */
function body(block: string): { fence: string; text: string } {
    const lines = block.split('\n');
    const open = /^(`{3,})text$/.exec(lines[0] ?? '');
    expect(open).not.toBeNull();
    const fence = open?.[1] ?? '';
    const closes = new RegExp(`^ {0,3}\`{${String(fence.length)},} *$`);
    const close = lines.findIndex((line, index) => index > 0 && closes.test(line));
    expect(close).toBe(lines.length - 1);
    return { fence, text: lines.slice(1, close).join('\n') };
}

describe('codeBlock', () => {
    test.each([
        ['a regular expression', String.raw`^ADR-\d{4}(#[a-z0-9-]+)?$`],
        ['an escaped pipe, which no table cell can hold', String.raw`^(a\|b)\\|c$`],
        ['backslashes before punctuation', String.raw`\. \* \_ \[ \] \\`],
        ['Markdown and HTML syntax', '*a* _b_ [c](d) <e> &amp; ~~f~~ | g'],
        ['several lines', 'first\nsecond'],
        ['a fence on a line of its own', 'before\n```\n  ````\nafter'],
        ['a leading backtick run and leading spaces', '``` x\n   ` y'],
        ['nothing', ''],
    ])('shows %s unchanged', (_, text) => {
        expect(body(codeBlock(text)).text).toBe(text);
    });

    test('uses a fence longer than any run of backticks in the text', () => {
        const text = 'one ` three ``` five `````';
        const { fence, text: shown } = body(codeBlock(text));
        expect(fence).toBe('``````');
        expect(shown).toBe(text);
    });

    test('refuses what Markdown would normalize: carriage returns and NUL', () => {
        expect(() => codeBlock('a\r\nb')).toThrow(/carriage return or NUL/);
        expect(() => codeBlock('a\0b')).toThrow(/carriage return or NUL/);
    });

    test('uses the shortest fence CommonMark allows when the text has no backticks', () => {
        expect(body(codeBlock('plain')).fence).toBe('```');
    });
});
