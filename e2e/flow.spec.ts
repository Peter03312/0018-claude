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
