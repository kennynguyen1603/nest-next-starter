import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ApiPublic } from '@/decorators/http.decorators';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @ApiPublic()
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  @Get()
  check() {
    return { status: 'ok' };
  }
}
