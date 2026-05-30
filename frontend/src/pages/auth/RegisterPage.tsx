/**
 * 注册页组件文件。
 * 职责：渲染注册表单（姓名/邮箱/密码/确认密码），校验通过后调用 AuthContext.register
 * 完成注册并自动登录，跳转到首页；异常时统一展示中文兜底错误。
 */
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * RegisterPage：注册页面组件，包含表单校验、密码二次确认与提交流程。
 */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单提交处理：仅传递服务端需要的字段，confirmPassword 仅用于前端校验
  async function handleSubmit(values: RegisterFormValues) {
    setError(null);
    setIsSubmitting(true);

    try {
      await register({ name: values.name, email: values.email, password: values.password });
      // 状态切换：注册成功后用 replace 跳转，避免回退到注册页
      navigate('/', { replace: true });
    } catch {
      // 错误兜底：统一展示通用提示，避免泄漏后端细节
      setError('注册失败，请稍后重试或更换邮箱');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>注册销智</Typography.Title>
        <Typography.Paragraph className="auth-subtitle">创建账号，开始沉淀高转化销售能力</Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} className="auth-alert" /> : null}
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" autoComplete="name" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="sales@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }]}>
            <Input.Password placeholder="至少 8 位密码" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            注册
          </Button>
        </Form>
        <Typography.Paragraph className="auth-switch">
          已有账号？<Link to="/login">返回登录</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
}
