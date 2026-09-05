import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'siam-aqua-super-secure-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ImportController],
  providers: [ImportService, PrismaService],
  exports: [ImportService],
})
export class ImportModule {}
