import { HttpStatus, NotFoundException } from '@nestjs/common';

import { FileType } from '@/files/domain/file';
import { FileRepository } from '@/files/infrastructure/persistence/file.repository';
import { UserRepository } from '@/users/infrastructure/persistence/user.repository';

// A file is visible to its uploader, or to the user whose profile photo it is.
// Anything else reports 404 so file ids cannot be probed.
export async function findAccessibleFile(
  fileRepository: FileRepository,
  userRepository: UserRepository,
  id: FileType['id'],
  userId: string,
): Promise<FileType> {
  const file = await fileRepository.findById(id);

  if (file) {
    if (file.ownerId === userId) return file;

    const user = await userRepository.findById(userId);
    if (user?.photo?.id === file.id) return file;
  }

  throw new NotFoundException({
    status: HttpStatus.NOT_FOUND,
    error: 'fileNotFound',
  });
}
