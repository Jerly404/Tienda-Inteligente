import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { AuthenticatedRequest, JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { ShoppingListsService } from './shopping-lists.service';

class CreateListDto { @IsString() @Length(2, 100) name!: string; }
class UpdateListDto { @IsString() @Length(2, 100) name!: string; }
class SetItemDto {
  @IsNumber() @Min(0.001) @Max(1000000) quantity!: number;
  @IsOptional() @IsString() @Length(1, 20) unit?: string;
}
class CompareListDto { @IsOptional() @IsBoolean() delivery?: boolean; }
@ApiTags('shopping-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(private readonly lists: ShoppingListsService) {}
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListDto) { return this.lists.create(req.user.sub, dto.name); }
  @Get() mine(@Req() req: AuthenticatedRequest) { return this.lists.mine(req.user.sub); }
  @Get(':id') get(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.lists.get(req.user.sub, id); }
  @Patch(':id') rename(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateListDto) { return this.lists.rename(req.user.sub, id, dto.name); }
  @Put(':id/items/:variantId') setItem(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('variantId') variantId: string, @Body() dto: SetItemDto) { return this.lists.setItem(req.user.sub, id, variantId, dto.quantity, dto.unit); }
  @Post(':id/compare') compare(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CompareListDto) { return this.lists.compare(req.user.sub, id, !!dto.delivery); }
  @Delete(':id/items/:itemId') removeItem(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('itemId') itemId: string) { return this.lists.removeItem(req.user.sub, id, itemId); }
  @Delete(':id') remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.lists.remove(req.user.sub, id); }
}
