import { Injectable } from '@nestjs/common';
import { FileType } from './domain/file';
import { NullableType } from '@/utils/types/nullable.type';
import { FileRepository } from './infrastructure/persistence/file.repository';

@Injectable()
export class FilesService {
  constructor(private readonly fileRepository: FileRepository) {}

  async create(data: Omit<FileType, 'id'>): Promise<FileType> {
    return this.fileRepository.create(data);
  }

  async findById(id: FileType['id']): Promise<NullableType<FileType>> {
    return this.fileRepository.findById(id);
  }

  async findByIds(ids: FileType['id'][]): Promise<FileType[]> {
    return this.fileRepository.findByIds(ids);
  }
}
