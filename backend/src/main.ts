import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ErrorLogFilter } from './common/error-log.filter';
import { PrismaService } from './prisma/prisma.service';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://comiu.link',
  'https://www.comiu.link',
  'https://comiu.vercel.app',
];

const VERCEL_PREVIEW_ORIGIN_PATTERN =
  /^https:\/\/comiu(?:-[a-z0-9-]+)?-ktgw-s-projects\.vercel\.app$/;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const frontendUrl = (
    process.env.FRONTEND_URL ?? 'http://localhost:3000'
  ).trim();
  const extraOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    frontendUrl,
    ...extraOrigins,
  ]);
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        VERCEL_PREVIEW_ORIGIN_PATTERN.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  const prisma = app.get(PrismaService);
  app.useGlobalFilters(new ErrorLogFilter(prisma));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
