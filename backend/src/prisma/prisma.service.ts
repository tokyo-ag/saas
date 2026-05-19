import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=15`,
        },
      },
    });
  }

  async onModuleInit() {
    for (let i = 0; i < 5; i++) {
      try {
        await this.$connect();
        return;
      } catch (e) {
        if (i === 4) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
