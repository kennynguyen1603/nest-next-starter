import { ErrorDto } from '@/common/dto/error.dto';
import { Public } from '@/decorators/public.decorator';
import { Serialize } from '@/utils/interceptors/serialize';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorService,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheckDto } from './dto/health.dto';
import { AllConfigType } from '@/config/config.type';
import { AuthService } from '@/auth/auth.service';
import { SWAGGER_PATH } from '@/main';
import { Redis } from 'ioredis';
import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const isDocumentDatabase = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase;

@ApiTags('Health')
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly health: HealthCheckService,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly mongoDb: MongooseHealthIndicator,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: HealthCheckDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    type: ErrorDto,
  })
  @Serialize(HealthCheckDto)
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const list = [
      isDocumentDatabase
        ? () => this.mongoDb.pingCheck('database', { timeout: 5000 })
        : () => this.db.pingCheck('database', { timeout: 5000 }),
      () => this.checkRedis(),
    ];
    if (
      this.configService.get('app.nodeEnv', { infer: true }) !== 'production'
    ) {
      list.push(() => this.checkSwaggerDocs());
    }
    return this.health.check(list);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('redis');
    const redis = new Redis({
      host: this.configService.getOrThrow('redis.host', { infer: true }),
      port: this.configService.getOrThrow('redis.port', { infer: true }),
      password: this.configService.get('redis.password', { infer: true }),
      lazyConnect: true,
    });
    try {
      await redis.connect();
      await redis.ping();
      return indicator.up();
    } catch (e: unknown) {
      this.logger.error({ err: e }, 'Redis health check failed');
      return indicator.down({ error: String(e) });
    } finally {
      redis.disconnect();
    }
  }

  private async checkSwaggerDocs(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('api-docs');
    const port = this.configService.getOrThrow('app.port', { infer: true });
    const url = `http://localhost:${port}${SWAGGER_PATH}`;
    try {
      const response = await fetch(url, {
        headers: this.authService.createBasicAuthHeaders(),
      });
      if (!response.ok) {
        this.logger.warn(
          { statusCode: response.status },
          'Swagger docs health check failed',
        );
        return indicator.down({ statusCode: response.status });
      }
      return indicator.up();
    } catch (e: unknown) {
      this.logger.error({ err: e }, 'Swagger docs health check threw error');
      return indicator.down({ error: String(e) });
    }
  }
}
