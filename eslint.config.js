// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    globalIgnores(['dist/', 'coverage/', 'site/']),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Validators are user-supplied functions of arbitrary shape; `any` in
            // the *parameter* position of the Validator type is the honest signature.
            '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
            '@typescript-eslint/no-invalid-void-type': ['error', { allowAsThisParameter: true }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: ['**/*.js', '**/*.mjs'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        files: ['test/**', 'examples/**'],
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    prettier,
);
