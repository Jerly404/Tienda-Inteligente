import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ComparisonModule } from './modules/comparison/comparison.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { StoreModule } from './modules/store/store.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ConfigurationModule,
    CatalogModule,
    ComparisonModule,
    BusinessesModule,
    QuotationsModule,
    GeocodingModule,
    StoreModule,
    SupplierModule,
    AdminModule,
  ],
})
export class AppModule {}
