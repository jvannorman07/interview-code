module.exports = {
  bail: true,
  verbose: false,
  silent: false,
  testEnvironment: 'node',
  testRegex: '(\\.|/)(inttest)\\.[jt]sx?$',
  rootDir: '../src',
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['src', 'node_modules'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  globalSetup: '<rootDir>/../test/jest.globalsetup.inttest.js',
  setupFilesAfterEnv: ['<rootDir>/../test/jest.setup.inttest.js'],
}
