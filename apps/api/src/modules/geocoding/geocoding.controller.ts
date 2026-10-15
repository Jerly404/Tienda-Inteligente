import { Controller, Get, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('reverse')
  async reverse(@Query('lat') lat?: string, @Query('lon') lon?: string) {
    if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
      throw new BadRequestException('Se requieren coordenadas válidas (lat y lon).');
    }
    const result = await this.geocodingService.reverse(Number(lat), Number(lon));
    if (!result) {
      throw new NotFoundException('No se encontró dirección para las coordenadas indicadas.');
    }
    return result;
  }

  @Get('search')
  async search(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Ingresa una dirección para buscar.');
    }
    const result = await this.geocodingService.search(q);
    if (!result) {
      throw new NotFoundException('No se encontraron coordenadas para la dirección ingresada.');
    }
    return result;
  }
}
