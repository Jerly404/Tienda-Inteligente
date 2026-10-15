import { Controller, Get } from '@nestjs/common';

@Controller('config')
export class PublicConfigController {
  @Get('public') getPublicConfig() {
    return { googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || null };
  }
}
