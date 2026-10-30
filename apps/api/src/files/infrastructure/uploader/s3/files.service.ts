import {
  HttpStatus,
  Injectable,
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
import { findAccessibleFile } from '@/files/infrastructure/uploader/file-access';
import { IFileUploadService } from '@/files/infrastructure/uploader/uploader.interface';
import { UserRepository } from '@/users/infrastructure/persistence/user.repository';

@Injectable()
export class FilesS3Service implements IFileUploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
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

  async create(
    file: Express.MulterS3.File,
    ownerId: string,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'selectFile' },
      });
    }

    return {
      file: await this.fileRepository.create({ path: file.key, ownerId }),
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
    expiresIn = 3600,
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

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: Math.min(Math.max(Math.floor(expiresIn) || 3600, 1), 3600),
    });
    return { url };
  }
}
