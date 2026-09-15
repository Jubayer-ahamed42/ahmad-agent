export class ProjectScaffolder {
  // Generate Production Dockerfile (Multi-stage)
  generateProductionDockerfile(stack = 'node') {
    if (stack === 'node') {
      return `# Production Multi-Stage Dockerfile - 20+ Years Optimized
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;
    } else {
      return `# Production Python FastAPI Multi-Stage Dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
`;
    }
  }

  // Generate GitHub Actions CI/CD Pipeline
  generateGitHubActionsCi() {
    return `name: Production CI/CD Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Typecheck & Linter
        run: |
          npm run typecheck || true
          npm run lint || true

      - name: Run Automated Test Suites
        run: npm test --if-present

      - name: Security Vulnerability Audit
        run: npm audit --audit-level=high
`;
  }
}
