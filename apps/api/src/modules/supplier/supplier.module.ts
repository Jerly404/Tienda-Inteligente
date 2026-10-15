import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { SupplierManagementController } from './supplier-management.controller';
import { SupplierManagementService } from './supplier-management.service';

@Module({
  imports: [AuthModule],
  controllers: [SupplierManagementController],
  providers: [SupplierManagementService],
})
export class SupplierModule {}
