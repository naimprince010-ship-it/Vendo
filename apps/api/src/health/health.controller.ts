import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../authorization/public.decorator';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOkResponse({ description: 'API process health' })
  getHealth(): { status: 'ok'; service: 'vendo-api' } {
    return { status: 'ok', service: 'vendo-api' };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'API and required database dependency are ready' })
  @ApiServiceUnavailableResponse({ description: 'A required dependency is unavailable' })
  async getReadiness(): Promise<{ status: 'ready'; service: 'vendo-api'; database: 'ready' }> {
    try {
      await this.database.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'vendo-api', database: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Service is not ready');
    }
  }
}
