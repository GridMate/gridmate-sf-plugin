module.exports = {
  root: true,
  extends: ['eslint-config-salesforce-typescript', 'plugin:sf-plugin/recommended'],
  rules: {
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
  },
};
