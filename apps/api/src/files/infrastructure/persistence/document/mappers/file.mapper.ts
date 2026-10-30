import { FileType } from '@/files/domain/file';
import { FileSchemaClass } from '../entities/file.schema';

export class FileMapper {
  static toDomain(raw: FileSchemaClass): FileType {
    const domainEntity = new FileType();
    domainEntity.id = raw._id.toString();
    domainEntity.path = raw.path;
    domainEntity.ownerId = raw.ownerId;
    return domainEntity;
  }

  static toPersistence(domainEntity: FileType): FileSchemaClass {
    const schema = new FileSchemaClass();
    schema._id = domainEntity.id;
    schema.path = domainEntity.path;
    schema.ownerId = domainEntity.ownerId;
    return schema;
  }
}
