# Изолированный образ контент-завода (экранирование на общем сервере: свой контейнер, свои зависимости).
# Сборка/запуск — см. deploy/docker-compose.yml.  Ключи НЕ зашиваются в образ (приходят через env_file).
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive TZ=Europe/Moscow

# Системные зависимости headless-Chromium (рендер Remotion) + шрифты + bash
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates fonts-liberation \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libgbm1 libasound2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
      libxrandr2 libpango-1.0-0 libcairo2 libxshmfence1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Код (без node_modules/out/run/.env — см. .dockerignore)
COPY . .
# Node-модули Remotion + headless-браузер в образ
RUN cd remotion && npm install --no-audit --no-fund && npx remotion browser ensure

# Программный GL для рендера без видеокарты
ENV REMOTION_RENDER_FLAGS=--gl=swiftshader

# Планировщик: 1 процесс, логи в stdout (docker logs)
CMD ["node", "deploy/scheduler.mjs"]
