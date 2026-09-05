import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AccessClaims {
  sub: string;
  cid: string;
  sid: string;
  ver: number;
  typ: 'access';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Authentication required');

    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (claims.typ !== 'access' || !claims.sub || !claims.cid || !claims.sid) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.database.user.findFirst({
      where: {
        id: claims.sub,
        companyId: claims.cid,
        status: 'ACTIVE',
        credentialVersion: claims.ver,
        authSessions: { some: { id: claims.sid, revokedAt: null, expiresAt: { gt: new Date() } } },
      },
      select: {
        id: true,
        companyId: true,
        email: true,
        firstName: true,
        lastName: true,
        credentialVersion: true,
        userBranches: { select: { branchId: true } },
        userRoles: {
          select: {
            role: {
              select: { permissions: { select: { permission: { select: { key: true } } } } },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Session is no longer valid');

    request.principal = {
      userId: user.id,
      companyId: user.companyId,
      sessionId: claims.sid,
      credentialVersion: user.credentialVersion,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      branchIds: user.userBranches.map(({ branchId }) => branchId),
      permissions: new Set(
        user.userRoles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    };
    return true;
  }
}
