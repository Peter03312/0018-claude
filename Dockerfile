# syntax=docker/dockerfile:1

# ---- 依赖层 ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 构建层 ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- web 服务（纯静态，nginx 托管，无在线调用）----
FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1

# ---- verify 一次性验收服务：类型检查 + Vitest 全组合 + Playwright 真实流程 ----
FROM node:20-bookworm-slim AS verify
WORKDIR /app
ENV CI=true \
  PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
# Playwright Chromium 运行所需系统库
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation fonts-noto-cjk \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 \
    libcups2 libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 wget xdg-utils \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx playwright install chromium
CMD ["npm", "run", "verify"]
