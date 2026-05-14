export type AwsConfig = {
  region?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
};

export type AwsS3UploadOptions = {
  filename: string;
  folder?: string;
  useEnv?: boolean;
  contentType?: string;
};

export type AwsS3UploadResponse = {
  path: string;
  size?: number;
  mimetype?: string;
  filename?: string;
  originalname?: string;
};
