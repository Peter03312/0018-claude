import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('缺少选择时逐项报错且不产生结论', async ({ page }) => {
  // 初始无错误、无结论
  await expect(page.getByTestId('face-control-error')).toHaveCount(0);
  await expect(page.getByTestId('result-direction')).toHaveCount(0);

  await page.getByTestId('verify-button').click();

  await expect(page.getByTestId('face-control-error')).toBeVisible();
  await expect(page.getByTestId('top-control-error')).toBeVisible();
  await expect(page.getByTestId('tip-control-error')).toBeVisible();
  await expect(page.getByTestId('result-direction')).toHaveCount(0);
  await expect(page.getByTestId('result-banner')).toContainText('选择不完整');

  // 图示停留在占位状态
  await expect(page.getByTestId('figure-final-empty')).toBeVisible();
});

test('背胶面右向水印被归一为左向', async ({ page }) => {
  await page.getByTestId('face-control-gum').click();
  await page.getByTestId('top-control-U').click();
  await page.getByTestId('tip-control-R').click();

  const banner = page.getByTestId('result-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('背胶面');
  await expect(banner).toContainText('目录视向：左');

  await expect(page.getByTestId('result-direction')).toHaveText('目录视向：左');
  await expect(page.getByTestId('figure-final-direction')).toHaveText(
    '目录视向：左',
  );
  // 镜像步骤存在并标注竖轴镜像
  await expect(page.getByTestId('figure-mirror')).toContainText('左右镜像');
});

test('图案面同姿态仍保持右向', async ({ page }) => {
  await page.getByTestId('face-control-design').click();
  await page.getByTestId('top-control-U').click();
  await page.getByTestId('tip-control-R').click();

  await expect(page.getByTestId('result-direction')).toHaveText('目录视向：右');
  await expect(page.getByTestId('figure-final-direction')).toHaveText(
    '目录视向：右',
  );
  // 图案面第三栏明确标注“不镜像”
  await expect(page.getByTestId('figure-mirror')).toContainText('不镜像');
});

test('修改已完成选择后旧结论立即消失', async ({ page }) => {
  await page.getByTestId('face-control-gum').click();
  await page.getByTestId('top-control-U').click();
  await page.getByTestId('tip-control-R').click();
  await expect(page.getByTestId('result-direction')).toHaveText('目录视向：左');

  // 取消“上边”选择
  await page.getByTestId('top-control-U').click();
  await expect(page.getByTestId('result-direction')).toHaveCount(0);
  await expect(page.getByTestId('top-control-error')).toBeVisible();
  await expect(page.getByTestId('result-banner')).toContainText('选择不完整');

  // 重新选上边为右，并把观察面改为图案面：归位后朝右
  await page.getByTestId('top-control-R').click();
  await page.getByTestId('face-control-gum').click(); // 取消背胶面
  await page.getByTestId('face-control-design').click();
  // 上边在右、尖端朝右 → 归位后朝上
  await expect(page.getByTestId('result-direction')).toHaveText('目录视向：上');
});

test('旋转+镜像组合：背胶面、上边在右、尖端朝上 → 目录视向右', async ({
  page,
}) => {
  await page.getByTestId('face-control-gum').click();
  await page.getByTestId('top-control-R').click();
  await page.getByTestId('tip-control-U').click();

  await expect(page.getByTestId('result-direction')).toHaveText('目录视向：右');
  await expect(page.getByTestId('figure-rotated')).toContainText('顺时针 270°');
});

test.describe('复核链接交接', () => {
  test.beforeEach(async ({ context }) => {
    // 允许真实剪贴板写入（仅对 Chromium 生效）
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('背胶面·上边朝右·尖端朝上：复制复核链接，同事打开即见相同选择/步骤图/结论', async ({
    page,
    context,
  }) => {
    // —— 鉴定员完成一次校核 ——
    await page.getByTestId('face-control-gum').click();
    await page.getByTestId('top-control-R').click();
    await page.getByTestId('tip-control-U').click();
    await expect(page.getByTestId('result-direction')).toHaveText('目录视向：右');

    // 结论产生后才有复制入口
    const copyBtn = page.getByTestId('copy-review-link');
    await expect(copyBtn).toBeVisible();

    await copyBtn.click();
    await expect(page.getByTestId('copy-status')).toContainText('已复制');

    // 复制内容只包含当前三项选择
    const copied = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    const link = new URL(copied);
    expect(Array.from(link.searchParams.keys())).toEqual([
      'face',
      'top',
      'tip',
    ]);
    expect(link.searchParams.get('face')).toBe('gum');
    expect(link.searchParams.get('top')).toBe('R');
    expect(link.searchParams.get('tip')).toBe('U');

    // —— 同事打开链接：相同选择、步骤图与结论 ——
    const colleague = await context.newPage();
    await colleague.goto(copied);

    await expect(
      colleague.getByTestId('face-control-gum'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(colleague.getByTestId('top-control-R')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(colleague.getByTestId('tip-control-U')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      colleague.getByTestId('result-direction'),
    ).toHaveText('目录视向：右');
    await expect(
      colleague.getByTestId('figure-final-direction'),
    ).toHaveText('目录视向：右');
    await expect(colleague.getByTestId('figure-rotated')).toContainText(
      '顺时针 270°',
    );
    await expect(colleague.getByTestId('figure-mirror')).toContainText(
      '左右镜像',
    );
    await expect(colleague.getByTestId('copy-review-link')).toBeVisible();

    await colleague.close();
  });

  test('链接取值未知：仅忽略该字段并就近提示重新选择，其他合法字段保留', async ({
    page,
  }) => {
    await page.goto('/?tip=U&top=??&face=gum'); // 乱序 + top 未知

    await expect(page.getByTestId('face-control-gum')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('tip-control-U')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('top-control-error')).toBeVisible();
    await expect(page.getByTestId('top-control-error')).toContainText(
      '重新选择',
    );
    // 另外两项无错误，结论暂不产生
    await expect(page.getByTestId('face-control-error')).toHaveCount(0);
    await expect(page.getByTestId('tip-control-error')).toHaveCount(0);
    await expect(page.getByTestId('result-direction')).toHaveCount(0);

    // 重新选择上边后提示消失，按恢复出的三项继续走原归一
    await page.getByTestId('top-control-R').click();
    await expect(page.getByTestId('top-control-error')).toHaveCount(0);
    await expect(page.getByTestId('result-direction')).toHaveText('目录视向：右');
  });
});
