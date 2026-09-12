# 邮票水印目录视向校核器

纯浏览器（React + TypeScript + Vite，零在线调用）校核邮票水印在目录中的朝向。

## 背景与归一规则

鉴定员从邮票**背胶面**观察水印时，肉眼所见会相对图案面**左右翻转**；若邮票在托片中又转过方向，直接照抄箭头朝向便会把目录视向记反。

本工具的归一规则固定为两步（见 `src/domain/orientation.ts`）：

1. **旋转**：先把邮票上边旋转到屏幕上方（画面整体刚性旋转，水印尖端同向旋转）；
2. **镜像**：若观察自**背胶面**，再沿归位后画面的**竖轴**做一次左右镜像；图案面不镜像。

最终水印尖端方向即**目录视向**（上/右/下/左）。

界面操作：

- 选择观察面：**图案面** / **背胶面**；
- 指出当前画面中邮票**上边**所在方向（上/右/下/左）；
- 选择当前画面中水印**尖端**所指方向（上/右/下/左）。

页面并列绘出四个轮廓：① 原始观察轮廓 → ② 旋转归位步骤 → ③ 镜像步骤（背胶面绘竖轴与镜像前残影；图案面明确标注“不镜像”）→ ④ 最终目录轮廓。

行为约束：

- 缺少任一选择时，在**对应控件旁**反馈错误且**不产生结论**；
- 修改已完成的选择后，**旧结论立即消失**（结论由三项选择派生产生，可再次点按取消某项）。

验收对照（上边已朝上、尖端朝右）：

| 观察面 | 旋转后 | 镜像 | 目录视向 |
| --- | --- | --- | --- |
| 背胶面 | 右 | 竖轴左右镜像 | **左** |
| 图案面 | 右 | 不镜像 | **右** |

## 本地开发

```bash
npm ci
npm run dev        # 开发服务器
npm run build      # 类型检查 + 生产构建到 dist/
npm run test       # Vitest：含 2×4×4=32 个全部离散组合
npm run e2e        # Playwright：实际点选流程（需先 npx playwright install chromium）
npm run verify     # 一次性验收：build → typecheck → vitest → playwright
```

宿主端口可由 `WEB_PORT` 覆盖（默认 8080）：

```bash
WEB_PORT=9000 npm run preview
```

## Docker Compose

```bash
# 常驻 web（nginx 托管纯静态产物，无任何在线服务调用）
docker compose up web --build
# 浏览器打开 http://localhost:8080 （WEB_PORT=9000 docker compose up web 可覆盖宿主端口）

# 一次性验收服务：类型检查 + 全部离散组合 Vitest + Playwright 真实点选
docker compose run --rm verify
```

`verify` 容器内部自行安装并运行 Playwright Chromium，不依赖 `web` 容器；退出码非零即验收失败。

## 测试覆盖

- `src/domain/orientation.test.ts`
  - 32 个离散组合（2 观察面 × 4 上边方向 × 4 尖端方向），并用独立的索引参考实现交叉校验；
  - 旋转/镜像原语、归位 16 态、验收对照（背胶右→左、图案右→右）。
- `src/App.test.tsx`：缺项就地报错且无结论、背胶/图案对照、修改选择后旧结论立即消失。
- `e2e/flow.spec.ts`（Playwright）：真实浏览器中验证完整选择流程与上述对照。
