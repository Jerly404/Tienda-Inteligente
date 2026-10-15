import { Module } from '@nestjs/common';
import { AuthModule } from '../../../core/auth/auth.module';
import { ComparisonModule } from '../../comparison/comparison.module';
import { BuyerController } from './buyer.controller';
import { BuyerGuard } from './buyer.controller';
import { BuyerService } from './buyer.service';

@Module({
  imports: [AuthModule, ComparisonModule],
  controllers: [BuyerController],
  providers: [BuyerGuard, BuyerService],
  exports: [BuyerService],
})
export class BuyerModule {}
