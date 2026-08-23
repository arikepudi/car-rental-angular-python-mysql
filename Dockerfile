# ---- stage 1: build the Angular app ----
# Angular CLI 22 requires Node >=22.22.3 — node:20 fails "ng build" with a version-gate error.
FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- stage 2: the Python runtime ----
FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server/ ./server/
COPY --from=client-build /app/client/dist/client/browser ./client/dist/client/browser

ENV ENVIRONMENT=production
EXPOSE 8000
CMD ["sh", "-c", "cd server && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
