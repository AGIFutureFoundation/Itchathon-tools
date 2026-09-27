# Sapient.X — single container. Node 24, no npm dependencies for the app
# itself; only the Claude Code CLI is installed globally so `claude -p` works.
FROM node:24-alpine

RUN npm i -g @anthropic-ai/claude-code && npm cache clean --force

WORKDIR /srv
COPY app/ ./app/
COPY prompts/ ./prompts/
COPY config/ ./config/

# Writable state: JSONL logs and daily audit files. Mounted as a volume in compose.
RUN mkdir -p /srv/data/audit && chown -R node:node /srv
USER node

ENV PORT=3141 \
    NODE_ENV=production \
    REQUIRE_AUTH=0 \
    RETURNS_MODEL=sonnet

EXPOSE 3141
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3141/api/health || exit 1

CMD ["node","app/server.js"]
