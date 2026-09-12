import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

const pick = async (
  user: ReturnType<typeof userEvent.setup>,
  testid: string,
) => {
  await user.click(screen.getByTestId(testid));
};

describe('校核器交互', () => {
  it('初始状态：无错误提示、无结论', () => {
    render(<App />);
    expect(screen.queryByTestId('face-control-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-control-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tip-control-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(screen.getByTestId('figure-final-empty')).toBeInTheDocument();
  });

  it('点击校核按钮后，逐项在对应控件旁反馈错误，且不产生结论', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('verify-button'));

    expect(screen.getByTestId('face-control-error')).toHaveTextContent('观察面');
    expect(screen.getByTestId('top-control-error')).toHaveTextContent('上边');
    expect(screen.getByTestId('tip-control-error')).toHaveTextContent('尖端');
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(screen.getByTestId('result-banner')).toHaveTextContent('选择不完整');
  });

  it('背胶面、上边朝上、尖端朝右 → 目录视向为左', async () => {
    const user = userEvent.setup();
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-U');
    await pick(user, 'tip-control-R');

    const banner = screen.getByTestId('result-banner');
    expect(banner).toHaveTextContent('目录视向：左');
    expect(screen.getByTestId('figure-final-direction')).toHaveTextContent(
      '目录视向：左',
    );
    // 镜像步骤确实被绘制：镜像前右（残影）→ 镜像后左
    expect(screen.getByTestId('figure-mirror')).toBeInTheDocument();
    expect(screen.queryByTestId('figure-mirror-empty')).not.toBeInTheDocument();
  });

  it('图案面同姿态 → 目录视向保持右向，且镜像步骤标注“不镜像”', async () => {
    const user = userEvent.setup();
    render(<App />);

    await pick(user, 'face-control-design');
    await pick(user, 'top-control-U');
    await pick(user, 'tip-control-R');

    expect(screen.getByTestId('result-banner')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-final-direction')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-mirror')).toHaveTextContent('不镜像');
  });

  it('修改已完成的选择后，旧结论立即消失并按新输入更新', async () => {
    const user = userEvent.setup();
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-U');
    await pick(user, 'tip-control-R');
    expect(screen.getByTestId('result-banner')).toHaveTextContent(
      '目录视向：左',
    );

    // 改选图案面：右向不再被镜像
    await pick(user, 'face-control-design');
    expect(screen.getByTestId('result-banner')).toHaveTextContent(
      '目录视向：右',
    );

    // 取消上边选择：结论立即消失，错误就近出现
    await pick(user, 'top-control-U');
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(screen.getByTestId('top-control-error')).toHaveTextContent('上边');
    expect(screen.getByTestId('result-banner')).toHaveTextContent('选择不完整');
  });

  it('非归位姿态也正确：背胶面、上边在右、尖端朝上 → 目录视向右', async () => {
    const user = userEvent.setup();
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-R');
    await pick(user, 'tip-control-U');

    expect(screen.getByTestId('result-banner')).toHaveTextContent(
      '目录视向：右',
    );
  });
});
