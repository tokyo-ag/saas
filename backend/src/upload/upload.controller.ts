import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { AdminOrMobileManageGuard } from '../auth/admin-or-mobile-manage.guard';
import { getUploadDir } from './upload-path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024;

@UseGuards(AdminOrMobileManageGuard)
@Controller('admin/upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: getUploadDir(),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXT.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              '画像ファイル（JPEG/PNG/GIF/WebP）のみ許可されています',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ファイルが選択されていません');
    return { url: `/uploads/${file.filename}` };
  }
}
