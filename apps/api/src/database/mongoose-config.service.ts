import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { AllConfigType } from '@/config/config.type';
import { Connection, Schema } from 'mongoose';
import mongooseAutoPopulate from 'mongoose-autopopulate';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  createMongooseOptions(): MongooseModuleOptions {
    const url = this.configService.get('database.url', { infer: true });
    return {
      uri: url,
      dbName: this.configService.get('database.name', { infer: true }),
      ...(url
        ? {}
        : {
            user: this.configService.get('database.username', { infer: true }),
            pass: this.configService.get('database.password', { infer: true }),
          }),
      connectionFactory(connection: Connection) {
        connection.plugin(mongooseAutoPopulate as (schema: Schema) => void);
        return connection;
      },
    };
  }
}
