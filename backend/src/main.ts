import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`Secretaria da Saúde backend is running on port ${port}`, 'Bootstrap');
}

bootstrap();
