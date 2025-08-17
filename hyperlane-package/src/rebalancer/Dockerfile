FROM node:20-alpine
WORKDIR /app
COPY . /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate || true
RUN if [ -f package.json ]; then pnpm install --frozen-lockfile || true; fi
CMD ["node", "dist/rebalancer/index.js"]
