import { registerAs } from '@nestjs/config';

import { IsEnum, IsString, ValidateIf } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { FileDriver, FileConfig } from './file-config.type';

class EnvironmentVariablesValidator {
  @IsEnum(FileDriver)
  FILE_DRIVER!: FileDriver;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  ACCESS_KEY_ID!: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  SECRET_ACCESS_KEY!: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_DEFAULT_S3_BUCKET!: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_S3_REGION!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) =>
      envValues.FILE_DRIVER === FileDriver.CLOUDINARY,
  )
  @IsString()
  CLOUDINARY_CLOUD_NAME!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) =>
      envValues.FILE_DRIVER === FileDriver.CLOUDINARY,
  )
  @IsString()
  CLOUDINARY_API_KEY!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) =>
      envValues.FILE_DRIVER === FileDriver.CLOUDINARY,
  )
  @IsString()
  CLOUDINARY_API_SECRET!: string;
}

export default registerAs<FileConfig>('file', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    driver:
      (process.env.FILE_DRIVER as FileDriver | undefined) ?? FileDriver.LOCAL,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    awsDefaultS3Bucket: process.env.AWS_DEFAULT_S3_BUCKET,
    awsS3Region: process.env.AWS_S3_REGION,
    maxFileSize: 5242880,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  };
});
