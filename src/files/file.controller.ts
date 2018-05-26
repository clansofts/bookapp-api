import { BadRequestException, Controller, FileInterceptor, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import * as path from 'path';
import * as uuidv4 from 'uuidv4';

import { FILE_ERRORS } from '../constants';

function fileFilter(req, file, cb) {
  if (
    !file.mimetype.includes('jpeg') &&
    !file.mimetype.includes('png') &&
    !file.mimetype.includes('epub')
  ) {
    return cb(null, false);
  }
  cb(null, true);
}

const options = { fileFilter, limits: { fileSize: 10000000 } };

@Controller('api')
export class FileController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', options))
  uploadFile(@UploadedFile() file) {
    if (!file) {
      throw new BadRequestException(FILE_ERRORS.INVALID_MIMETYPE_ERR);
    }
    const filename = `${uuidv4()}${path.extname(file.originalname)}`;
  }
}
