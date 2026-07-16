import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AgenciesModule } from './agencies/agencies.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { LeadsModule } from './leads/leads.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { validateEnvironment } from './config/validate-env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AgenciesModule,
    PropertiesModule,
    LeadsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
