import { Injectable } from '@nestjs/common';
import { FileType } from './domain/file';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class FilesService {
  async findById(id: FileType['id']): Promise<NullableType<FileType>> {
    return null;
  }
}
