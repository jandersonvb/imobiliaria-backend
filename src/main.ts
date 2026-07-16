import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  const allowedOrigins = config
    .get<string>('FRONTEND_URL', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  app.use((request: { method: string; headers: { origin?: string } }, response: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const origin = request.headers.origin;
    if (mutating && origin && !allowedOrigins.includes(origin)) {
      response.status(403).json({ message: 'Origem não autorizada.' });
      return;
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = config.get<number>('PORT', 3333);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
