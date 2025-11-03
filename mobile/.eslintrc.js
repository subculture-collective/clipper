module.exports = {
  root: true,
  extends: ['universe/native', 'prettier'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/ban-types': 'off',
  },
};
