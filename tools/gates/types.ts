export type Severity = 'error' | 'warning';

export interface Finding {
    readonly gate: string;
    readonly file: string;
    readonly message: string;
    readonly severity: Severity;
}

export interface SchemaRule {
    readonly glob: string;
    readonly schema: string;
    readonly requiredSections?: readonly string[];
    readonly exclude?: readonly string[];
}

export interface GatesConfig {
    readonly markdown: { readonly include: readonly string[]; readonly exclude: readonly string[] };
    readonly ids: Readonly<Record<string, { readonly pattern: string; readonly dir: string }>>;
    readonly reachability: {
        readonly roots: readonly string[];
        readonly mustReach: readonly string[];
        readonly exclude: readonly string[];
    };
    readonly schemas: readonly SchemaRule[];
    readonly binding: { readonly sources: readonly string[]; readonly ontology: string };
    readonly lexicon: {
        readonly config: string;
        readonly include: readonly string[];
        readonly exclude: readonly string[];
    };
    readonly changelog: { readonly file: string; readonly categories: readonly string[] };
    readonly generated: Readonly<Record<string, readonly string[]>>;
}

export interface Ontology {
    readonly annotation: string;
    readonly kinds: Readonly<
        Record<
            string,
            { readonly summary: string; readonly target_pattern: string; readonly resolver: string }
        >
    >;
    readonly invariants: Readonly<
        Record<string, { readonly meaning: string; readonly defined_in: string }>
    >;
}

export interface Lexicon {
    readonly language: string;
    readonly spelling: readonly {
        readonly avoid: string;
        readonly use: string;
        readonly note?: string;
    }[];
    readonly terms_to_avoid: readonly {
        readonly avoid: string;
        readonly use: string;
        readonly why: string;
    }[];
}

export interface Gate {
    readonly name: string;
    run(ctx: Context): Finding[];
    /** Repairs what can be repaired mechanically; returns the files it rewrote. */
    fix?(ctx: Context): string[];
}

export interface Context {
    readonly root: string;
    readonly config: GatesConfig;
    /** Repository-relative paths of every tracked-or-untracked file the walker found. */
    readonly files: readonly string[];
    read(relPath: string): string;
    exists(relPath: string): boolean;
    frontMatter(relPath: string): Record<string, unknown> | null;
    body(relPath: string): string;
    headings(relPath: string): readonly string[];
    matches(relPath: string, patterns: readonly string[]): boolean;
    select(include: readonly string[], exclude?: readonly string[]): string[];
    resolveId(id: string): string | null;
    today(): string;
}
