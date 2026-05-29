import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: LoginFormValues) {
    setError(null);
    setIsSubmitting(true);

    try {
      await login(values);
      navigate('/', { replace: true });
    } catch {
      setError('登录失败，请检查邮箱或密码');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>登录销智</Typography.Title>
        <Typography.Paragraph className="auth-subtitle">进入 AI 销售助手工作台</Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} className="auth-alert" /> : null}
        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="sales@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            登录
          </Button>
        </Form>
        <Typography.Paragraph className="auth-switch">
          还没有账号？<Link to="/register">立即注册</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
}
