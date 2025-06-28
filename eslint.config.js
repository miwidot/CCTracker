import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // ===== GENERAL JAVASCRIPT/TYPESCRIPT RULES =====
      'no-unused-vars': 'off', // Disabled in favor of TypeScript version
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-undef': 'off', // TypeScript handles this
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'off', // Disabled in favor of TypeScript version
      'no-empty-function': 'off', // Disabled in favor of TypeScript version
      'no-array-constructor': 'off', // Disabled in favor of TypeScript version
      'no-loss-of-precision': 'error',
      'no-promise-executor-return': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-optional-chaining': 'error',
      'require-atomic-updates': 'error',

      // ===== TYPESCRIPT-SPECIFIC RULES =====
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Changed to warn for gradual adoption
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'off', // Too verbose for most cases
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Too verbose for most cases
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for most cases
      '@typescript-eslint/strict-boolean-expressions': [
        'warn', // Changed to warn as it can be overly strict
        {
          allowString: true, // Allow truthy string checks
          allowNumber: true, // Allow truthy number checks
          allowNullableObject: true,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions', 'functions', 'methods'],
        },
      ],
      '@typescript-eslint/no-array-constructor': 'error',

      // ===== NAMING CONVENTIONS =====
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false, // Don't require 'I' prefix
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'], // Allow PascalCase for React components
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'], // Allow PascalCase for React components
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'method',
          format: ['camelCase'], // Standard camelCase for methods
        },
        {
          selector: 'property',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'], // Allow various formats for different contexts
          leadingUnderscore: 'allow',
          filter: {
            // Allow any format for string literal properties (like IPC channel names)
            regex: '^[a-zA-Z0-9_:-]+$',
            match: false,
          },
        },
      ],

      // ===== REACT-SPECIFIC RULES =====
      'react/jsx-uses-react': 'off', // Not needed with React 17+ JSX transform
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-pascal-case': 'error',
      'react/jsx-fragments': ['error', 'syntax'],
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-curly-brace-presence': [
        'error',
        {
          props: 'never',
          children: 'never',
        },
      ],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-wrap-multilines': [
        'error',
        {
          declaration: 'parens-new-line',
          assignment: 'parens-new-line',
          return: 'parens-new-line',
          arrow: 'parens-new-line',
          condition: 'parens-new-line',
          logical: 'parens-new-line',
          prop: 'parens-new-line',
        },
      ],
      'react/self-closing-comp': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-danger': 'warn',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      // 'react/no-unknown-dom-prop': 'error', // Not available in current version
      'react/no-unsafe': 'error',
      'react/prop-types': 'off', // We use TypeScript for prop validation
      'react/require-render-return': 'error',
      'react/style-prop-object': 'error',
      'react/jsx-key': [
        'error',
        {
          checkFragmentShorthand: true,
          checkKeyMustBeforeSpread: true,
          warnOnDuplicates: true,
        },
      ],

      // ===== REACT HOOKS RULES =====
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // ===== BASIC JAVASCRIPT RULES FOR JS FILES =====
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // ===== REACT RULES FOR JS FILES =====
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-pascal-case': 'error',
      'react/self-closing-comp': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
    rules: {
      // ===== TEST FILE OVERRIDES =====
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/require-await': 'off', // Allow async test functions without direct await
      '@typescript-eslint/naming-convention': 'off', // Allow React component mocking with PascalCase
      'no-console': 'off',
    },
  },
  {
    files: ['**/types.ts', '**/types/**/*.ts'],
    rules: {
      // ===== TYPE DEFINITION FILE OVERRIDES =====
      '@typescript-eslint/naming-convention': 'off', // Allow flexible naming for type definitions
    },
  },
  {
    files: ['webpack.*.js', 'jest.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // CommonJS for config files
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      // ===== CONFIG FILE OVERRIDES =====
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off', // Handled by globals
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // ES modules for ESLint config
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'release/**',
      '*.min.js',
      'coverage/**',
      '.nyc_output/**',
      'test-logger.js',
    ],
  },
];