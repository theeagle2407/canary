FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production CANARY_HOST=0.0.0.0 CANARY_PORT=5173
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/sdk ./sdk
COPY --from=build --chown=node:node /app/src ./src
RUN mkdir -p /app/.canary-keeper /app/.canary-mainnet && chown node:node /app/.canary-keeper /app/.canary-mainnet
USER node
EXPOSE 5173
VOLUME ["/app/.canary-keeper", "/app/.canary-mainnet"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:5173/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","scripts/start-stack.mjs","--production"]
