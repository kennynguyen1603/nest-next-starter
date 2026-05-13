import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { AllConfigType } from '@/config/config.type';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class FilesCloudinaryService implements IFileUploadService {
  constructor(
    private readonly fileRepository: FileRepository,
    configService: ConfigService<AllConfigType>,
  ) {
    cloudinary.config({
      cloud_name: configService.get('file.cloudinaryCloudName', {
        infer: true,
      }),
      api_key: configService.get('file.cloudinaryApiKey', { infer: true }),
      api_secret: configService.get('file.cloudinaryApiSecret', {
        infer: true,
      }),
    });
  }

  async create(file: MulterFile): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    const result = await this.uploadToCloudinary(file.buffer);

    return {
      file: await this.fileRepository.create({ path: result.secure_url }),
    };
  }

  async uploadFromBuffer(
    buffer: Buffer,
    _options: { filename: string; mimetype: string },
  ): Promise<FileType> {
    const result = await this.uploadToCloudinary(buffer);
    return this.fileRepository.create({ path: result.secure_url });
  }

  async getFileUrl(id: FileType['id']): Promise<{ url: string }> {
    const file = await this.fileRepository.findById(id);

    if (!file) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'fileNotFound',
      });
    }

    return { url: file.path };
  }

  private uploadToCloudinary(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'cloudinary upload failed'));
          } else {
            resolve(result);
          }
        },
      );
      stream.end(buffer);
    });
  }
}
