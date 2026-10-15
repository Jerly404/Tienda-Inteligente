import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
export class ReviewRequestDto {
 @IsIn(['PENDING','APPROVED','REJECTED']) status!: string;
 @IsOptional() @IsString() @MaxLength(1000) adminNote?: string;
}
export class ActiveDto { @IsBoolean() active!: boolean; }
export class CategoryDto {
 @IsString() @Length(2,80) name!: string;
 @IsOptional() @IsString() @MaxLength(500) description?: string;
 @IsBoolean() active!: boolean;
}
