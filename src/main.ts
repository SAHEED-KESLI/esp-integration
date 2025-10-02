// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  const graphqlUrl = isProduction
    ? configService.get<string>('GRAPHQL_URL_PROD')
    : configService.get<string>('GRAPHQL_URL_DEV');

  // Enable CORS
  app.enableCors();
  app.setGlobalPrefix('api');
  // Swagger only in dev/staging
  if (!isProduction) {
    console.time('Swagger setup');
    const config = new DocumentBuilder()
      .setTitle('😊😊😊 Welcome to ESP-INTEGRATION! 😊😊😊')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/', app, document);
  }
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<string>('PORT') || '3000';
  //
  await app.listen(port, '0.0.0.0');
}

bootstrap();
