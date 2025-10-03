// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // helpful for debugging during startup
  });

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Determine GraphQL endpoint (optional: used if passed to frontend/docs)
  const graphqlUrl = isProduction
    ? configService.get<string>('GRAPHQL_URL_PROD')
    : configService.get<string>('GRAPHQL_URL_DEV');

  // Enable CORS (can be restricted further in production)
  app.enableCors({
    origin: isProduction ? configService.get<string>('CORS_ORIGIN') : '*',
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Swagger setup (only enabled outside production)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('ESP-INTEGRATION API')
      .setDescription('API documentation for ESP-INTEGRATION service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw error on extra properties
      transform: true, // auto-transform payloads
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Start server
  const port = configService.get<number>('PORT') || 3004;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}/api`);
  if (!isProduction) {
    console.log(`📖 Swagger docs available at http://localhost:${port}/docs`);
    console.log(`🔗 GraphQL endpoint: ${graphqlUrl}`);
  }
}

bootstrap();
