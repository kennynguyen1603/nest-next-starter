import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesLocalService } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesLocalController {
  constructor(private readonly filesService: FilesLocalService) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    return this.filesService.create(file);
  }

  @ApiOperation({ summary: 'Get URL to display a file' })
  @ApiParam({ name: 'id', description: 'File record ID' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { url: { type: 'string' } } },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/url')
  async getFileUrl(@Param('id') id: string): Promise<{ url: string }> {
    return this.filesService.getFileUrl(id);
  }

  // Served publicly so <img src> can load it (a bearer token can't ride on an
  // <img> request). The random, unguessable filename is the capability. Validate
  // strictly to the generated pattern to rule out path traversal / arbitrary reads.
  private static readonly SAFE_FILENAME = /^[A-Za-z0-9]+\.(jpg|jpeg|png|gif)$/;

  @Get(':path')
  @ApiExcludeEndpoint()
  download(@Param('path') path: string, @Response() response: ExpressResponse) {
    if (!FilesLocalController.SAFE_FILENAME.test(path)) {
      throw new NotFoundException();
    }
    return response.sendFile(path, { root: './files' });
  }
}
