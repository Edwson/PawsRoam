/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    // Handle module aliases (if you set them up in tsconfig.json)
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: true,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  // collectCoverageFrom: [
  //  'src/**/*.{ts,js}',
  //  '!src/**/*.d.ts',
  //  '!src/**/index.{ts,js}',
  // ],

  // The directory where Jest should output its coverage files
  // coverageDirectory: 'coverage',

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if you need a setup file
};
