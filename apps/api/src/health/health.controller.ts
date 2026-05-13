import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { I18nContext, I18nService } from 'nestjs-i18n';

import { ApiPublic } from '@/decorators/http.decorators';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly i18n: I18nService) {}

  @ApiPublic()
  @ApiOkResponse({ schema: { example: { status: 'Service is healthy' } } })
  @Get()
  check() {
    return {
      status: this.i18n.t('health.OK', {
        lang: I18nContext.current()?.lang ?? 'en',
      }),
    };
  }
}
