import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

describe('route guards', () => {
  it('未登录访问受保护页面时跳转登录页', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>业务首页</div>} />
          </Route>
          <Route path="/login" element={<div>登录页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('登录页')).toBeInTheDocument();
  });

  it('已登录访问登录页时跳转首页', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: '销售顾问',
        email: 'sales@example.com',
        role: 'SALES',
      },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<div>登录页</div>} />
          </Route>
          <Route path="/" element={<div>首页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
  });
});
