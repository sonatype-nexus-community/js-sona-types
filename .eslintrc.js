module.exports = {
  // plugins: ["prettier"],
  // parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  // extends: [
  //   'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
  // ],
  // parserOptions: {
  //   ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
  //   sourceType: 'module', // Allows for the use of imports
  // },
  // rules: {
  //   '@typescript-eslint/no-use-before-define': 'off',
  //   'prefer-spread': 'off',
  //   "prettier/prettier": "error",
  //   '@typescript-eslint/no-array-constructor': 'off',
  //   '@typescript-eslint/no-var-requires': 'off',
  //   '@typescript-eslint/no-explicit-any': 'off',
  // },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  root: true,
};
