import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminManagementController } from './admin-management.controller';
import { AdminCatalogService } from './admin-catalog.service';

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [AdminBusinessesController, AdminCatalogController, AdminManagementController],
  providers: [AdminCatalogService],
})
export class AdminModule {}
