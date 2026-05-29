import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import { useAuth } from '@/contexts/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  navigate.mockClear();
});

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('邮箱格式非法时不提交登录', async () => {
    const login = vi.fn();
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'bad-email' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => expect(screen.getByText('请输入有效邮箱')).toBeInTheDocument());
    expect(login).not.toHaveBeenCalled();
  });

  it('登录成功后跳转首页', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'sales@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'sales@example.com', password: 'password123' }));
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('登录失败时展示错误提示', async () => {
    const login = vi.fn().mockRejectedValue(new Error('invalid credentials'));
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'sales@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => expect(screen.getByText('登录失败，请检查邮箱或密码')).toBeInTheDocument());
  });
});
