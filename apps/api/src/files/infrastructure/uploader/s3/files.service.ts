import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { AllConfigType } from '@/config/config.type';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';

@Injectable()
export class FilesS3Service implements IFileUploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    this.s3 = new S3Client({
      region: configService.getOrThrow('file.awsS3Region', { infer: true }),
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

  async create(file: Express.MulterS3.File): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'selectFile' },
      });
    }

    return {
      file: await this.fileRepository.create({ path: file.key }),
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
    const key = `${randomStringGenerator()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimetype,
      }),
    );

    return this.fileRepository.create({ path: key });
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

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.path,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { url };
  }

  async getPresignedUrl(
    id: FileType['id'],
    expiresIn = 3600,
  ): Promise<{ url: string }> {
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

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.path,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return { url };
  }
}
