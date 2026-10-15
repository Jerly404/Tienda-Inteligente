import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('products') products(@Query('q') q = '') { return this.catalog.search(q); }
  @Get('search') globalSearch(@Query('q') q='') { return this.catalog.globalSearch(q); }
  @Get('offers') offers(@Query('variantId') variantId?: string) { return this.catalog.offers(variantId); }
  @Get('suppliers/map') supplierLocations(@Query('latitude') latitude?: string, @Query('longitude') longitude?: string) {
    if ((latitude === undefined) !== (longitude === undefined)) throw new BadRequestException('Envía latitud y longitud juntas.');
    const lat = latitude === undefined ? undefined : Number(latitude);
    const lon = longitude === undefined ? undefined : Number(longitude);
    if (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon! < -180 || lon! > 180)) throw new BadRequestException('Las coordenadas no son válidas.');
    return this.catalog.supplierLocations(lat, lon);
  }
}
