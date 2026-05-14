import { type BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';

function useBullFactory(
  configService: ConfigService<AllConfigType>,
): BullRootModuleOptions {
  return {
    prefix: `${configService.get('app.apiPrefix', { infer: true }) ?? 'api'}:bull`,
    connection: {
      host: configService.getOrThrow('redis.host', { infer: true }),
      port: configService.getOrThrow('redis.port', { infer: true }),
      password: configService.get('redis.password', { infer: true }),
      tls: configService.get('redis.tls', { infer: true }),
    },
  };
}

export default useBullFactory;
