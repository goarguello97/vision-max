# Stage 1: Dependencies
FROM node:18 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:18 AS production
WORKDIR /app

RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.env.example ./

USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]