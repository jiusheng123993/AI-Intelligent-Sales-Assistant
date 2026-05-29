import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('展示销智 AI 销售助手首页标题', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: '销智 AI 销售助手' })).toBeInTheDocument();
  });

  it('展示两个核心模块入口', () => {
    render(<App />);

    expect(screen.getByText('AI 话术演练场')).toBeInTheDocument();
    expect(screen.getByText('销冠话术宝')).toBeInTheDocument();
  });
});
