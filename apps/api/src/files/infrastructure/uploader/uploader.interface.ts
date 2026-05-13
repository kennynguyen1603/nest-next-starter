import { FileType } from '@/files/domain/file';

export const FILE_UPLOAD_SERVICE = 'FILE_UPLOAD_SERVICE';

export interface IFileUploadService {
  uploadFromBuffer(
    buffer: Buffer,
    options: { filename: string; mimetype: string },
  ): Promise<FileType>;
  getFileUrl(id: FileType['id']): Promise<{ url: string }>;
}
