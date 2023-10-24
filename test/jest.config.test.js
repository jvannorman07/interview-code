module.exports = {
  bail: true,
  verbose: false,
  silent: false,
  testEnvironment: 'node',
  testRegex: '(\\.|/)(test)\\.[jt]sx?$',
  rootDir: '../src',
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['src', 'node_modules'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // globalSetup: '<rootDir>/../test/jest.globalsetup.test.js',
  setupFilesAfterEnv: ['<rootDir>/../test/jest.setup.test.js'],
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
}
