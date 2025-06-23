// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Optional: Add any other global setup for tests here
// For example, mocking global objects or functions

// Example: Mock Next.js router if needed globally for many tests
// (though often better to mock per-test or per-module)
// jest.mock('next/navigation', () => ({
//   useRouter: jest.fn(() => ({
//     push: jest.fn(),
//     replace: jest.fn(),
//     back: jest.fn(),
//     prefetch: jest.fn(),
//     pathname: '/',
//     query: {},
//     asPath: '/',
//   })),
//   usePathname: jest.fn(() => '/'),
//   useSearchParams: jest.fn(() => ({ get: jest.fn() })),
// }));

// Mock matchMedia for components that might use it (e.g., some UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
