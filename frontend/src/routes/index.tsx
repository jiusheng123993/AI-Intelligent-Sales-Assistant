/**
 * 应用路由配置文件。
 * 职责：
 *  1) 提供首页 HomePage（含登录态切换的头部导航）；
 *  2) 通过 PublicOnlyRoute / ProtectedRoute 守卫，划分公共路由与受保护工作台路由；
 *  3) 聚合登录、注册、知识库、演练、话术库等业务页面入口。
 */
import { Button, Card, Col, Layout, Row, Space, Typography } from 'antd';
import { CustomerServiceOutlined, MessageOutlined } from '@ant-design/icons';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/auth/PublicOnlyRoute';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { KnowledgePage } from '@/pages/knowledge/KnowledgePage';
import { PracticePage } from '@/pages/practice/PracticePage';
import { ScriptsPage } from '@/pages/scripts/ScriptsPage';
import { TeamPage } from '@/pages/team/TeamPage';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/**
 * 首页组件：展示产品介绍与模块入口；根据登录态切换“登录/注册”按钮与“退出登录”操作。
 */
function HomePage() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Title level={3} className="app-logo">
          销智 AI 销售助手
        </Title>
        {isAuthenticated && user ? (
          <Space className="app-nav">
            <Text className="app-user">{user.name}</Text>
            <Button onClick={logout}>退出登录</Button>
          </Space>
        ) : (
          <Space className="app-nav">
            <Button ghost href="/login">
              登录
            </Button>
            <Button type="primary" href="/register">
              注册
            </Button>
          </Space>
        )}
      </Header>
      <Content className="app-content">
        <section className="hero-section">
          <Title>销智 AI 销售助手</Title>
          <Paragraph className="hero-description">
            用 AI 模拟演练沉淀标准话术，用实时推荐辅助销售沟通。
          </Paragraph>
        </section>
        <Row gutter={[24, 24]} className="module-grid">
          <Col xs={24} md={12}>
            <Card className="module-card">
              <CustomerServiceOutlined className="module-icon" />
              <Title level={3}>AI 话术演练场</Title>
              <Paragraph>面向新人、老销售与培训师，提供销售场景模拟、AI 客户对练和即时反馈。</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="module-card">
              <MessageOutlined className="module-icon" />
              <Title level={3}>销冠话术宝</Title>
              <Paragraph>短期通过浏览器扩展验证 RAG 话术推荐，长期演进为桌面级 AI 输入法。</Paragraph>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}

/**
 * AppRoutes：统一路由出口。
 * - 公共路由（PublicOnlyRoute）：未登录可访问，已登录会被重定向至首页；
 * - 受保护路由（ProtectedRoute）：仅登录后可访问的工作台子页面；
 * - 其余未匹配路径全部回退到首页。
 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/workspace" element={<HomePage />} />
        <Route path="/workspace/knowledge" element={<KnowledgePage />} />
        <Route path="/workspace/practice" element={<PracticePage />} />
        <Route path="/workspace/scripts" element={<ScriptsPage />} />
        <Route path="/workspace/team" element={<TeamPage />} />
      </Route>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default AppRoutes;
