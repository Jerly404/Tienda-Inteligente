import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { BuyerModule } from './buyer/buyer.module';
import { DashboardController } from './dashboard/dashboard.controller';
import { ShoppingListsController } from './shopping-lists/shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists/shopping-lists.service';

@Module({
  imports: [AuthModule, BuyerModule],
  controllers: [DashboardController, ShoppingListsController],
  providers: [ShoppingListsService],
})
export class StoreModule {}
