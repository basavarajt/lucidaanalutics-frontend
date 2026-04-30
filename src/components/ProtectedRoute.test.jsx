import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@clerk/clerk-react';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state while auth is initializing', () => {
    useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>secure content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it('redirects to login when user is not signed in', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>secure content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('login screen')).toBeInTheDocument();
  });

  it('renders child content for signed-in users', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>secure content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('secure content')).toBeInTheDocument();
  });
});
