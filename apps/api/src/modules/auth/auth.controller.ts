import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: { emailOrPhone: string; password: string; totpCode?: string },
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown';
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('register/public')
  async registerPublic(
    @Body() dto: { name: string; email: string; phone?: string; password: string },
  ) {
    return this.authService.registerPublicUser(dto);
  }

  @Post('social')
  async socialAuth(
    @Body() dto: { provider: 'google' | 'facebook'; email: string; name: string; socialId: string },
  ) {
    return this.authService.socialAuthStub(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
