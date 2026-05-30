/**
 * 登录页组件文件。
 * 职责：渲染登录表单，提交后调用 AuthContext.login 完成认证，成功后跳转首页；
 * 失败统一展示中文错误兜底提示。
 */
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

/**
 * LoginPage：登录页面组件，负责本页面的表单校验、错误展示与提交流程。
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单提交处理：清理上次错误，进入 loading，调用登录 API，失败统一兜底提示
  async function handleSubmit(values: LoginFormValues) {
    setError(null);
    setIsSubmitting(true);

    try {
      await login(values);
      // 状态切换：登录成功后用 replace 跳转，避免回退仍停留在登录页
      navigate('/', { replace: true });
    } catch {
      // 错误兜底：不暴露具体后端错误细节，统一展示用户友好提示
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
