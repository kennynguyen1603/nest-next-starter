import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { AllConfigType } from '@/config/config.type';
import { findAccessibleFile } from '@/files/infrastructure/uploader/file-access';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';
import { UserRepository } from '@/users/infrastructure/persistence/user.repository';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class FilesCloudinaryService implements IFileUploadService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
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

  async create(file: MulterFile, ownerId: string): Promise<{ file: FileType }> {
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
      file: await this.fileRepository.create({
        path: result.secure_url,
        ownerId,
      }),
    };
  }

  async uploadFromBuffer(
    buffer: Buffer,
    _options: { filename: string; mimetype: string },
    ownerId: string | null = null,
  ): Promise<FileType> {
    const result = await this.uploadToCloudinary(buffer);
    return this.fileRepository.create({ path: result.secure_url, ownerId });
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
