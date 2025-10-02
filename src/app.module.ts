import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { ThrottlerModule } from '@nestjs/throttler';
import { IntegrationsModule } from './integrations/integrations.module';
import * as Joi from 'joi';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: parseInt(configService.getOrThrow('THROTTLE_TTL'), 10),
          limit: parseInt(configService.getOrThrow('THROTTLE_LIMIT'), 10),
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        const env = process.env.NODE_ENV?.trim();
        switch (env) {
          case 'test':
            return '.env.test';
          case 'production':
            return '.env.prod';
          case 'development':
          default:
            return '.env';
        }
      })(),
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),
        PORT: Joi.number().required(),
        DATABASE_URL: Joi.string().required(),
        THROTTLE_TTL: Joi.string().required(),
        THROTTLE_LIMIT: Joi.string().required(),
        // GOOGLE_MAPS_API_KEY: Joi.string().required(),
      }),
    }),
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
