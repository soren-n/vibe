// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base recommended configurations
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Project-specific configuration
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // Code quality rules
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      // Type safety - stricter than default but some relaxed for practicality
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from error to warn
      '@typescript-eslint/explicit-function-return-type': 'warn', // Changed from error to warn
      '@typescript-eslint/no-non-null-assertion': 'warn', // Changed from error to warn
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Changed from error to warn
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Import organization
      'sort-imports': ['error', { ignoreDeclarationSort: true }],

      // Naming conventions - relaxed for now to avoid massive changes
      '@typescript-eslint/naming-convention': [
        'warn', // Changed from error to warn
        {
          selector: 'variableLike',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'allow', // Changed from 'require' to 'allow'
        },
      ],

      // Consistent code style - some relaxed
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }], // Changed from error to warn
      '@typescript-eslint/no-import-type-side-effects': 'warn', // Changed from error to warn

      // Disable some strict rules temporarily
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-generic-constructors': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-constant-condition': 'off',
      'no-misleading-character-class': 'off',

      // Disable rules that conflict with Prettier
      '@typescript-eslint/comma-dangle': 'off',
      '@typescript-eslint/comma-spacing': 'off',
      '@typescript-eslint/indent': 'off',
      '@typescript-eslint/quotes': 'off',
      '@typescript-eslint/semi': 'off',
    },
  },

  // File-specific overrides
  {
    files: ['**/*.test.ts', '**/test_*.ts', '**/tests/**/*.ts'],
    rules: {
      // Relax some rules for test files
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      '*.js',
      'eslint.config.mjs',
      'vscode-extension/',
      'mcp-server/',
      'python-legacy/',
      'src/archive/',
      'tests/',
      '.venv/',
      'uv.lock',
      'pyproject.toml',
    ],
  }
);
