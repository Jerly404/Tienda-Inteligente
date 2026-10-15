import { IsBoolean, IsDateString, IsIn, IsInt, IsJSON, IsNumber, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min } from 'class-validator';
export class OfferDto {
 @IsString() variantId!: string;
 @IsString() branchId!: string;
 @IsNumber({maxDecimalPlaces:2}) @Min(.01) @Max(99999999) price!: number;
 @IsInt() @Min(1) minimumPackages!: number;
 @IsOptional() @IsInt() @Min(0) stockPackages?: number | null;
 @IsOptional() @IsInt() @Min(0) stockMinimumPackages?: number;
 @IsIn(['AVAILABLE','LIMITED','ON_REQUEST','OUT_OF_STOCK']) availability!: 'AVAILABLE'|'LIMITED'|'ON_REQUEST'|'OUT_OF_STOCK';
 @IsBoolean() active!: boolean;
}
export class PromotionDto {
 @IsString() offerId!: string;
 @IsNumber({maxDecimalPlaces:2}) @Min(.01) referencePrice!: number;
 @IsNumber({maxDecimalPlaces:2}) @Min(.01) promotionalPrice!: number;
 @IsInt() @Min(1) minimumPackages!: number;
 @IsDateString() startAt!: string;
 @IsDateString() endAt!: string;
 @IsOptional() @IsString() @MaxLength(1000) conditions?: string;
 @IsBoolean() active!: boolean;
}
export class CompanyDto {
 @IsString() @Length(2,120) name!: string;
 @IsOptional() @IsString() @MaxLength(160) legalName?: string;
 @IsOptional() @IsString() @Matches(/^\d{11}$/) taxId?: string;
 @IsOptional() @IsString() @IsUrl({require_protocol:true}) @MaxLength(500) imageUrl?: string;
 @IsOptional() @IsString() @Length(2,240) address?: string;
 @IsOptional() @IsString() @MaxLength(80) department?: string;
 @IsOptional() @IsString() @MaxLength(80) province?: string;
 @IsOptional() @IsString() @MaxLength(80) district?: string;
 @IsOptional() @IsString() @MaxLength(1000) description?: string;
 @IsOptional() @IsString() @MaxLength(24) phone?: string;
 @IsOptional() @IsString() @MaxLength(300) hours?: string;
 @IsOptional() @IsString() @MaxLength(1000) deliveryZones?: string;
 @IsOptional() @IsString() @MaxLength(20000) @IsJSON() deliveryZoneGeoJson?: string | null;
 @IsOptional() @IsString() @MaxLength(500) paymentMethods?: string;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) minimumOrder?: number;
 @IsOptional() @IsBoolean() deliveryAvailable?: boolean;
}
export class CoverageDto {
 @IsString() @Length(2,240) address!: string;
 @IsNumber() @Min(-90) @Max(90) latitude!: number;
 @IsNumber() @Min(-180) @Max(180) longitude!: number;
 @IsBoolean() deliveryAvailable!: boolean;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) deliveryFee?: number | null;
}
export class RequestProductDto {
 @IsString() @Length(3,160) name!: string;
 @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
