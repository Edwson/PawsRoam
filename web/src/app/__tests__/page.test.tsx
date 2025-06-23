import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page'; // Adjust path to your home page component

// If your Home page uses context or router, you might need to wrap it
// or mock those dependencies similar to the Layout test.
// For this basic example, assuming Home is simple.

describe('Home Page', () => {
  test('renders welcome message and core content', () => {
    render(<Home />);

    // Check for a heading or significant text element
    expect(screen.getByRole('heading', { name: /Welcome to PawsRoam!/i })).toBeInTheDocument();

    // Check for some descriptive text
    expect(screen.getByText(/The Ultimate Pet-Friendly Ecosystem/i)).toBeInTheDocument();
    expect(screen.getByText(/This is the beginning of the web application./i)).toBeInTheDocument();
  });
});
