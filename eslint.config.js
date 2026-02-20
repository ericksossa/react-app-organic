module.exports = [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', '**/*.ts', '**/*.tsx']
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-console': 'off'
    }
  }
];
