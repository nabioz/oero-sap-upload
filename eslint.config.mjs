export default [
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': 'warn',
        },
    },
    {
        ignores: ['**/dist/**', '**/node_modules/**'],
    },
];
