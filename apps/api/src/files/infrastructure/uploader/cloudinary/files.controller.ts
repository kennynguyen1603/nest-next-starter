import {
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { FilesCloudinaryService } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesCloudinaryController {
  constructor(private readonly filesService: FilesCloudinaryService) {}

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
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    },
    @Request() request: { user: JwtPayloadType },
  ): Promise<FileResponseDto> {
    return this.filesService.create(file, request.user.id);
  }

  @ApiOperation({ summary: 'Get URL to display a file' })
  @ApiParam({ name: 'id', description: 'File record ID' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { url: { type: 'string' } } },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/url')
  async getFileUrl(
    @Param('id') id: string,
    @Request() request: { user: JwtPayloadType },
  ): Promise<{ url: string }> {
    return this.filesService.getFileUrl(id, request.user.id);
  }
}
