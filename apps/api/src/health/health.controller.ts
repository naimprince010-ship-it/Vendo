import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../authorization/public.decorator';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'API process health' })
  getHealth(): { status: 'ok'; service: 'vendo-api' } {
    return { status: 'ok', service: 'vendo-api' };
  }
}
