import fs from 'fs';
import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AllConfigType } from '@/config/config.type';
import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { findAccessibleFile } from '@/files/infrastructure/uploader/file-access';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';
import { UserRepository } from '@/users/infrastructure/persistence/user.repository';

@Injectable()
export class FilesLocalService implements IFileUploadService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
    @InjectPinoLogger(FilesLocalService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    file: { path: string },
    ownerId: string,
  ): Promise<{ file: FileType }> {
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
        ownerId,
      }),
    };
  }

  async uploadFromBuffer(
    buffer: Buffer,
    options: { filename: string; mimetype: string },
    ownerId: string | null = null,
  ): Promise<FileType> {
    const ext =
      options.filename.split('.').pop()?.toLowerCase() ??
      options.mimetype.split('/')[1] ??
      'jpg';
    const filename = `${randomStringGenerator()}.${ext}`;

    this.logger.debug(
      { filename, mimetype: options.mimetype, size: buffer.length },
      'Writing file to local storage',
    );

    await fs.promises.mkdir('./files', { recursive: true });
    await fs.promises.writeFile(`./files/${filename}`, buffer);

    const apiPrefix = this.configService.get('app.apiPrefix', { infer: true });
    const file = await this.fileRepository.create({
      path: `/${apiPrefix}/v1/files/${filename}`,
      ownerId,
    });
    this.logger.info(
      { fileId: file.id, filename },
      'File saved to local storage',
    );
    return file;
  }

  async getFileUrl(
    id: FileType['id'],
    userId: string,
  ): Promise<{ url: string }> {
    const file = await findAccessibleFile(
      this.fileRepository,
      this.userRepository,
      id,
      userId,
    );

    if (file.path.startsWith('http')) {
      return { url: file.path };
    }

    const backendDomain = this.configService.getOrThrow('app.backendDomain', {
      infer: true,
    });
    return { url: `${backendDomain}${file.path}` };
  }
}
