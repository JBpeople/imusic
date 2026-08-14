FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

COPY src/frontend/package.json src/frontend/pnpm-lock.yaml src/frontend/pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY src/frontend/ ./
RUN ./node_modules/.bin/vite build


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/backend/ ./src/backend/
COPY --from=frontend-builder /build/frontend/dist/client/ ./src/frontend/dist/client/

EXPOSE 8001

CMD ["uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
