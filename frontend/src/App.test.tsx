import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@/api/auth', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/auth/tokenStorage', () => ({
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
}));

describe('App', () => {
  it('展示销智 AI 销售助手首页标题', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: '销智 AI 销售助手' })).toBeInTheDocument();
  });

  it('展示两个核心模块入口', async () => {
    render(<App />);

    expect(await screen.findByText('AI 话术演练场')).toBeInTheDocument();
    expect(screen.getByText('销冠话术宝')).toBeInTheDocument();
  });

  it('未登录时展示登录和注册入口', async () => {
    render(<App />);

    expect(await screen.findByRole('link', { name: /登\s*录/ })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /注\s*册/ })).toHaveAttribute('href', '/register');
  });
});
