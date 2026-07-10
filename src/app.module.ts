import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgenciesModule } from './agencies/agencies.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { LeadsModule } from './leads/leads.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AgenciesModule,
    PropertiesModule,
    LeadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
