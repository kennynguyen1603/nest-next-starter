import fs from 'fs';
import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

import { AllConfigType } from '@/config/config.type';
import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';

@Injectable()
export class FilesLocalService implements IFileUploadService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {}

  async create(file: { path: string }): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    return {
      file: await this.fileRepository.create({
        path: `/${this.configService.get('app.apiPrefix', {
          infer: true,
        })}/v1/${file.path}`,
      }),
    };
  }

  async uploadFromBuffer(
    buffer: Buffer,
    options: { filename: string; mimetype: string },
  ): Promise<FileType> {
    const ext =
      options.filename.split('.').pop()?.toLowerCase() ??
      options.mimetype.split('/')[1] ??
      'jpg';
    const filename = `${randomStringGenerator()}.${ext}`;

    await fs.promises.mkdir('./files', { recursive: true });
    await fs.promises.writeFile(`./files/${filename}`, buffer);

    const apiPrefix = this.configService.get('app.apiPrefix', { infer: true });
    return this.fileRepository.create({
      path: `/${apiPrefix}/v1/files/${filename}`,
    });
  }

  async getFileUrl(id: FileType['id']): Promise<{ url: string }> {
    const file = await this.fileRepository.findById(id);

    if (!file) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'fileNotFound',
      });
    }

    if (file.path.startsWith('http')) {
      return { url: file.path };
    }

    const backendDomain = this.configService.getOrThrow('app.backendDomain', {
      infer: true,
    });
    return { url: `${backendDomain}${file.path}` };
  }
}
