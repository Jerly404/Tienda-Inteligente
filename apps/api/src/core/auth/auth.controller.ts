import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsJSON, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthService } from './auth.service';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(10) password!: string;
  @IsIn(['OWNER','SUPPLIER']) role!: 'OWNER'|'SUPPLIER';
  @IsString() @Length(2,120) businessName!: string;
  @IsOptional() @IsString() @MaxLength(500) businessDescription?: string;
  @IsOptional() @IsString() @MaxLength(100) storeCategory?: string;
  @IsString() @Length(2,160) legalName!: string;
  @IsString() @Matches(/^\d{11}$/, { message: 'El RUC debe contener 11 dígitos.' }) taxId!: string;
  @IsString() @MinLength(9) @MaxLength(24) phone!: string;
  @IsString() @Length(3,120) address!: string;
  @IsString() @Length(2,80) department!: string;
  @IsString() @Length(2,80) province!: string;
  @IsString() @Length(2,80) district!: string;
  @IsOptional() @IsString() @MaxLength(20000) @IsJSON() deliveryZoneGeoJson?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000000) minimumOrder?: number;
  @IsOptional() @IsString() @MaxLength(120) businessHours?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @ArrayUnique() @IsIn(['Efectivo','Transferencia bancaria','Yape','Plin','Tarjeta','Depósito'], { each: true }) paymentMethods?: string[];
  @IsBoolean() deliveryAvailable!: boolean;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}
class UpdateAccountDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MinLength(1) currentPassword?: string;
}
class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(10) @MaxLength(128) newPassword!: string;
}
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
  @Patch('profile') @UseGuards(JwtAuthGuard) updateProfile(@Req() req:AuthenticatedRequest,@Body() dto:UpdateAccountDto) { return this.auth.updateProfile(req.user.sub,dto); }
  @Patch('password') @UseGuards(JwtAuthGuard) changePassword(@Req() req:AuthenticatedRequest,@Body() dto:ChangePasswordDto) { return this.auth.changePassword(req.user.sub,dto.currentPassword,dto.newPassword); }
}
