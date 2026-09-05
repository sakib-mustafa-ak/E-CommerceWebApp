import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'siam-aqua-super-secure-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [RbacController],
  providers: [RbacService, PrismaService],
  exports: [RbacService],
})
export class RbacModule {}
