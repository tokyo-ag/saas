import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').trim();
  app.enableCors({ origin: frontendUrl, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
