const nextJest = require('next/jest');

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({ dir: './' });

// Any custom config you want to pass to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // For @testing-library/jest-dom
  moduleNameMapper: {
    // Handle CSS imports (if you import CSS in components, e.g. CSS Modules)
    // '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // If you use CSS modules extensively

    // Handle module aliases (if you have them in tsconfig.json)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1', // If you have a styles alias
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',   // If you have a utils alias
  },
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // already defined

  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: true,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  // collectCoverageFrom: [
  //   'src/**/*.{js,jsx,ts,tsx}',
  //   '!src/**/*.d.ts',
  //   '!src/**/index.{js,jsx,ts,tsx}', // Often index files are just exports
  //   '!src/app/layout.tsx', // Exclude layout and other specific files if needed
  //   '!src/app/api/**' // Exclude API routes
  // ],

  // The directory where Jest should output its coverage files
  // coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: "v8", // or "babel"
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
