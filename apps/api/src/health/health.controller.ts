import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'API process health' })
  getHealth(): { status: 'ok'; service: 'vendo-api' } {
    return { status: 'ok', service: 'vendo-api' };
  }
}
