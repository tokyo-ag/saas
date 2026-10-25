FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build
CMD npx prisma migrate deploy && node dist/main
