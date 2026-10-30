import {
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';

import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { FileType } from '@/files/domain/file';
import { FileUploadDto } from './dto/file.dto';
import { AllConfigType } from '@/config/config.type';
import { findAccessibleFile } from '@/files/infrastructure/uploader/file-access';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';
import { UserRepository } from '@/users/infrastructure/persistence/user.repository';

@Injectable()
export class FilesS3PresignedService implements IFileUploadService {
  private s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    this.s3 = new S3Client({
      region: configService.get('file.awsS3Region', { infer: true }),
      credentials: {
        accessKeyId: configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
    this.bucket = configService.getOrThrow('file.awsDefaultS3Bucket', {
      infer: true,
    });
  }

  async create(
    file: FileUploadDto,
    ownerId: string,
  ): Promise<{ file: FileType; uploadSignedUrl: string }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    if (!file.fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: `cantUploadFileType`,
        },
      });
    }

    if (
      file.fileSize >
      (this.configService.get('file.maxFileSize', {
        infer: true,
      }) || 0)
    ) {
      throw new PayloadTooLargeException({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    }

    const key = `${randomStringGenerator()}.${file.fileName
      .split('.')
      .pop()
      ?.toLowerCase()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: file.fileSize,
    });
    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const data = await this.fileRepository.create({
      path: key,
      ownerId,
    });

    return {
      file: data,
      uploadSignedUrl: signedUrl,
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
    const key = `${randomStringGenerator()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimetype,
      }),
    );

    return this.fileRepository.create({ path: key, ownerId });
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

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.path,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { url };
  }
}
