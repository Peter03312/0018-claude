import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const pick = async (
  user: ReturnType<typeof userEvent.setup>,
  testid: string,
) => {
  await user.click(screen.getByTestId(testid));
};

/** 以给定查询串重新加载当前页面（jsdom 支持 history.replaceState） */
function openWith(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

function clipboardStub(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('复核链接恢复', () => {
  beforeEach(() => {
    openWith('');
  });

  afterEach(() => {
    openWith('');
  });

  it('完整合法链接：首次加载即恢复三项选择、步骤图与结论，无需再点选', () => {
    openWith('?face=gum&top=R&tip=U');
    render(<App />);

    expect(screen.getByTestId('face-control-gum')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('top-control-R')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('tip-control-U')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // 上边在右、尖端朝上 → 旋转归位后朝左；背胶面竖轴镜像 → 右
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-final-direction')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-rotated')).toHaveTextContent('顺时针 270°');
    // 结论产生后才出现复制入口
    expect(screen.getByTestId('copy-review-link')).toBeInTheDocument();
  });

  it('乱序参数同样恢复', () => {
    openWith('?tip=R&top=U&face=design');
    render(<App />);
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-mirror')).toHaveTextContent('不镜像');
  });

  it('部分合法字段：保留恢复值，缺项不产生结论', () => {
    openWith('?face=gum&tip=R');
    render(<App />);
    expect(screen.getByTestId('face-control-gum')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('tip-control-R')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('top-control-U')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(screen.getByTestId('result-banner')).toHaveTextContent('选择不完整');
  });

  it('未知取值：仅忽略该字段并在对应控件旁提示重新选择，其他字段保留', () => {
    openWith('?face=gum&top=ZZ&tip=R');
    render(<App />);

    expect(screen.getByTestId('face-control-gum')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('tip-control-R')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const topError = screen.getByTestId('top-control-error');
    expect(topError).toHaveTextContent('无法识别');
    expect(topError).toHaveTextContent('重新选择');
    // face/tip 旁无错误提示
    expect(
      screen.queryByTestId('face-control-error'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('tip-control-error'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();

    // 在该控件重新选择后，未知值提示消失并给出结论
  });  it('在提示未知的控件上重新选择后提示消失、结论产生', async () => {
    const user = userEvent.setup();
    openWith('?face=gum&top=ZZ&tip=R');
    render(<App />);
    expect(screen.getByTestId('top-control-error')).toHaveTextContent(
      '重新选择',
    );

    await pick(user, 'top-control-U');
    expect(
      screen.queryByTestId('top-control-error'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：左',
    );
  });

  it('无查询参数的访问：初始无错误、无结论、无复制入口', () => {
    render(<App />);
    expect(screen.queryByTestId('face-control-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('copy-review-link'),
    ).not.toBeInTheDocument();
  });
});

describe('复制复核链接', () => {
  beforeEach(() => {
    openWith('');
  });

  afterEach(() => {
    openWith('');
    vi.restoreAllMocks();
  });

  it('结论产生后出现复制入口，点击后复制内容只含三项选择并提示成功', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    // userEvent.setup() 会自带剪贴板桩，必须在其后安装我们的桩
    clipboardStub(writeText);
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-R');
    await pick(user, 'tip-control-U');

    const btn = screen.getByTestId('copy-review-link');
    expect(btn).toBeInTheDocument();
    await user.click(btn);

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = new URL(String(writeText.mock.calls[0]![0]));
    expect(copied.searchParams.get('face')).toBe('gum');
    expect(copied.searchParams.get('top')).toBe('R');
    expect(copied.searchParams.get('tip')).toBe('U');
    expect(Array.from(copied.searchParams.keys())).toEqual([
      'face',
      'top',
      'tip',
    ]);
    expect(screen.getByTestId('copy-status')).toHaveTextContent('已复制');
  });

  it('复制的链接重新打开可完整恢复选择、步骤图和结论', () => {
    window.history.replaceState(
      {},
      '',
      '/?face=gum&top=R&tip=U',
    );
    render(<App />);
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );
    expect(screen.getByTestId('figure-mirror')).toHaveTextContent('左右镜像');
    expect(screen.getByTestId('figure-final-direction')).toHaveTextContent(
      '目录视向：右',
    );
  });

  it('修改任一选择后：链接随新结论更新，旧结论与复制成功提示同步消失', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    clipboardStub(writeText);
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-U');
    await pick(user, 'tip-control-R');
    await user.click(screen.getByTestId('copy-review-link'));
    expect(screen.getByTestId('copy-status')).toHaveTextContent('已复制');
    expect(String(writeText.mock.calls[0]![0])).toContain('face=gum');

    // 改选图案面：旧结论（左）立即消失，成功提示也随结论区重挂载而消失
    await pick(user, 'face-control-design');
    expect(screen.queryByTestId('copy-status')).not.toBeInTheDocument();
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );

    // 再次复制：链接随新结论更新
    await user.click(screen.getByTestId('copy-review-link'));
    const copied = String(writeText.mock.calls[1]![0]);
    expect(copied).toContain('face=design');
    expect(copied).not.toContain('face=gum');
    expect(screen.getByTestId('copy-status')).toHaveTextContent('已复制');

    // 取消上边：结论与成功提示再次同步消失
    await pick(user, 'top-control-U');
    expect(screen.queryByTestId('result-direction')).not.toBeInTheDocument();
    expect(screen.queryByTestId('copy-review-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('copy-status')).not.toBeInTheDocument();
  });

  it('浏览器拒绝剪贴板访问：按钮旁反馈失败且不改变当前结论，并给出可手动复制的链接', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const user = userEvent.setup();
    clipboardStub(writeText);
    render(<App />);

    await pick(user, 'face-control-gum');
    await pick(user, 'top-control-R');
    await pick(user, 'tip-control-U');
    await user.click(screen.getByTestId('copy-review-link'));

    expect(screen.getByTestId('copy-status')).toHaveTextContent('拒绝');
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );
    const anchor = screen.getByTestId('review-link-anchor') as HTMLAnchorElement;
    const href = new URL(anchor.href);
    expect(href.searchParams.get('face')).toBe('gum');
    expect(href.searchParams.get('top')).toBe('R');
    expect(href.searchParams.get('tip')).toBe('U');
  });

  it('环境不提供剪贴板 API 时同样按失败反馈且结论不变', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<App />);

    await pick(user, 'face-control-design');
    await pick(user, 'top-control-U');
    await pick(user, 'tip-control-R');
    await user.click(screen.getByTestId('copy-review-link'));

    expect(screen.getByTestId('copy-status')).toHaveTextContent('拒绝');
    expect(screen.getByTestId('result-direction')).toHaveTextContent(
      '目录视向：右',
    );
  });
});
