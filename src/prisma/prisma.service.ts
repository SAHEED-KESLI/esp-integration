import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get<string>('DATABASE_URL'), // Load URL based on env`'),
        },
      },
      log: config.get<any>('prisma.log'),
      errorFormat: config.get<'pretty' | 'minimal'>('prisma.errorFormat'),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Utility for tests / dev */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    const modelNames = Object.keys(this).filter(
      (key) => typeof (this as any)[key]?.deleteMany === 'function',
    );
    for (const model of modelNames) {
      await (this as any)[model].deleteMany();
    }
  }
}
