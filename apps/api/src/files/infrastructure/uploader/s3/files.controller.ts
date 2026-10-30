import {
  Controller,
  Get,
  Param,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { FilesS3Service } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesS3Controller {
  constructor(private readonly filesService: FilesS3Service) {}

  @ApiCreatedResponse({ type: FileResponseDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.MulterS3.File,
    @Request() request: { user: JwtPayloadType },
  ): Promise<FileResponseDto> {
    return this.filesService.create(file, request.user.id);
  }

  @ApiOperation({ summary: 'Get a presigned URL to download/display a file' })
  @ApiParam({ name: 'id', description: 'File record ID' })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description: 'URL TTL in seconds (default and max: 3600)',
    type: Number,
  })
  @ApiOkResponse({
    schema: { type: 'object', properties: { url: { type: 'string' } } },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/url')
  async getFileUrl(
    @Param('id') id: string,
    @Request() request: { user: JwtPayloadType },
    @Query('expiresIn') expiresIn?: number,
  ): Promise<{ url: string }> {
    return this.filesService.getFileUrl(
      id,
      request.user.id,
      expiresIn ? Number(expiresIn) : undefined,
    );
  }
}
