import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class FavoriteDto {
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsString() businessId?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999) targetPrice?: number;
}
export class PreferencesDto {
  @IsInt() @Min(1) @Max(200) radiusKm!: number;
  @IsIn(['name', 'price', 'distance', 'updated']) sort!: string;
  @IsIn([10, 20, 50]) pageSize!: number;
  @Equals('PEN') currency!: string;
  @IsArray() @ArrayMaxSize(50) @IsString({each:true}) categories!: string[];
  @IsBoolean() priceDrops!: boolean;
  @IsBoolean() priceRises!: boolean;
  @IsBoolean() promotions!: boolean;
  @IsBoolean() expiringPromotions!: boolean;
  @IsBoolean() availability!: boolean;
}
export class SaveComparisonDto {
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({each:true}) supplierIds?: string[];
  @IsString() @Length(2, 100) title!: string;
  @IsString() variantId!: string;
  @IsNumber() @Min(0.001) @Max(100000) quantity!: number;
  @IsString() @Length(1, 20) unit!: string;
  @IsOptional() @IsBoolean() delivery?: boolean;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}
export class PurchaseItemDto {
  @IsString() variantId!: string;
  @IsInt() @Min(1) @Max(100000) packages!: number;
  @IsNumber({ maxDecimalPlaces:2 }) @Min(0.01) @Max(9999999) packagePrice!: number;
}
export class PurchaseDto {
  @Equals(true) confirmed!: boolean;
  @IsString() businessId!: string;
  @IsDateString() purchasedAt!: string;
  @IsNumber({ maxDecimalPlaces:2 }) @Min(0) @Max(9999999) deliveryCost!: number;
  @IsOptional() @IsString() comparisonId?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>PurchaseItemDto) items!: PurchaseItemDto[];
}
export class ReportQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() businessId?: string;
  @IsOptional() @IsString() categoryId?: string;
}
