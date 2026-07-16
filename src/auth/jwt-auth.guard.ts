import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { getSessionCookieName } from './session-cookie';

export type AuthenticatedRequest = Request & {
  user?: { sub: string; email: string };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Sessão não encontrada');

    try {
      request.user = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }

  private extractToken(request: Request): string | undefined {
    const cookieName = getSessionCookieName(this.configService);
    const cookie = request.headers.cookie
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));
    if (!cookie) return undefined;

    const value = cookie.slice(cookieName.length + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
}
