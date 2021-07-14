module.exports = {
  transform: {
    '^.+\\.ts?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  testRegex: '/src/.*\\.test?\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }  
  }
};
