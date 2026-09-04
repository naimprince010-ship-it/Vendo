import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, HealthModule] })
export class AppModule {}
