import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  uploadImage(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 2000, height: 1500, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(new InternalServerErrorException('Não foi possível enviar a imagem'));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(stream);
    });
  }

  async deleteImage(publicId: string) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  }
}
