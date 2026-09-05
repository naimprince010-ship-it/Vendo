import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000';

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: corsOrigins.split(','), credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', 'development') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Vendo API')
        .setDescription('Tiles + Sanitary POS API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('vendo_refresh')
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.get<number>('API_PORT', 4000));
}

void bootstrap();
