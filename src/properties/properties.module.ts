import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [AuthModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, CloudinaryService],
})
export class PropertiesModule {}
