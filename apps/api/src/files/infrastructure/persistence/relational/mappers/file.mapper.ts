import { FileType } from '@/files/domain/file';
import { FileEntity } from '../entities/file.entity';

export class FileMapper {
  static toDomain(raw: FileEntity): FileType {
    const domainEntity = new FileType();
    domainEntity.id = raw.id;
    domainEntity.path = raw.path;
    return domainEntity;
  }

  static toPersistence(domainEntity: FileType): FileEntity {
    const entity = new FileEntity();
    entity.id = domainEntity.id;
    entity.path = domainEntity.path;
    return entity;
  }
}
