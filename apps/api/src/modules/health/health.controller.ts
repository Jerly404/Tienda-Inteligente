import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get() status() { return { status: 'ok', service: 'tienda-inteligente-api', timestamp: new Date().toISOString() }; }
}
