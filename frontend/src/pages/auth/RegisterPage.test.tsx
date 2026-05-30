import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

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
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  it('两次密码不一致时不提交注册', async () => {
    const register = vi.fn();
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '销售顾问' } });
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'sales@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password456' } });
    fireEvent.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() => expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument());
    expect(register).not.toHaveBeenCalled();
  });

  it('注册成功后跳转首页', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '销售顾问' } });
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'sales@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        name: '销售顾问',
        email: 'sales@example.com',
        password: 'password123',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('注册失败时展示错误提示', async () => {
    const register = vi.fn().mockRejectedValue(new Error('email exists'));
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '销售顾问' } });
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'sales@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() => expect(screen.getByText('注册失败，请稍后重试或更换邮箱')).toBeInTheDocument());
  });
});
