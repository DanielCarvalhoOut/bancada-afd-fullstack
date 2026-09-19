import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // todas as rotas sob /api
  app.setGlobalPrefix('api');

  // valida DTOs de entrada e remove campos não declarados
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API da Bancada de AFD em http://localhost:${port}/api`);
}
bootstrap();
