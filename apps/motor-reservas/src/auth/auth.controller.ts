import { Controller, Post, Body } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './public.decorator';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const passwordValid = await bcrypt.compare(body.password, user.password);
    if (!passwordValid) {
      throw new Error('Contraseña incorrecta');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }
}
