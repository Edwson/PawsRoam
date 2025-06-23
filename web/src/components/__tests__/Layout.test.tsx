import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '@/components/Layout'; // Adjust path as necessary
import { useAuth } from '@/contexts/AuthContext'; // Adjust path
import { useRouter } from 'next/navigation'; // Adjust path

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the useRouter hook from next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    // Add other router methods if Layout uses them
  })),
}));

describe('Layout Component', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockUseAuth.mockReset();
  });

  test('renders header, children, and footer when not loading and user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: jest.fn(),
    });

    render(
      <Layout>
        <div>Test Children</div>
      </Layout>
    );

    // Check for PawsRoam logo/title in header (assuming it's an h1 or similar)
    expect(screen.getByRole('link', { name: /🐾 PawsRoam/i })).toBeInTheDocument();

    // Check for navigation links for non-authenticated user
    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Map Discovery/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register/i })).toBeInTheDocument(); // This is a button-styled link

    // Check if children are rendered
    expect(screen.getByText('Test Children')).toBeInTheDocument();

    // Check for footer text
    expect(screen.getByText(/© \d{4} PawsRoam. All rights reserved./i)).toBeInTheDocument();
  });

  test('renders navigation links for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      loading: false,
      logout: jest.fn(),
    });

    render(
      <Layout>
        <div>Test Children</div>
      </Layout>
    );

    expect(screen.getByRole('link', { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    // expect(screen.getByText(/Welcome, Test User!/i)).toBeInTheDocument(); // Welcome message might be styled differently
  });

  test('shows loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      logout: jest.fn(),
    });

    render(
      <Layout>
        <div>Test Children</div>
      </Layout>
    );

    expect(screen.getByText(/Loading application.../i)).toBeInTheDocument();
    expect(screen.queryByText('Test Children')).not.toBeInTheDocument();
  });
});
