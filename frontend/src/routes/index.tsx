import { Card, Col, Layout, Row, Typography } from 'antd';
import { CustomerServiceOutlined, MessageOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

function AppRoutes() {
  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Title level={3} className="app-logo">
          销智 AI 销售助手
        </Title>
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

export default AppRoutes;
