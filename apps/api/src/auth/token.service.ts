import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { durationSeconds } from './duration';

interface AccessIdentity {
  userId: string;
  companyId: string;
  sessionId: string;
  credentialVersion: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  createFamilyId(): string {
    return randomUUID();
  }

  hashOpaqueToken(token: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(token)
      .digest('hex');
  }

  refreshExpiry(from = new Date()): Date {
    return new Date(
      from.getTime() + durationSeconds(this.config.getOrThrow<string>('REFRESH_TOKEN_TTL')) * 1000,
    );
  }

  passwordResetExpiry(from = new Date()): Date {
    return new Date(
      from.getTime() + durationSeconds(this.config.getOrThrow<string>('PASSWORD_RESET_TTL')) * 1000,
    );
  }

  accessTtlSeconds(): number {
    return durationSeconds(this.config.getOrThrow<string>('ACCESS_TOKEN_TTL'));
  }

  signAccessToken(identity: AccessIdentity): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: identity.userId,
        cid: identity.companyId,
        sid: identity.sessionId,
        ver: identity.credentialVersion,
        typ: 'access',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
        expiresIn: this.accessTtlSeconds(),
      },
    );
  }
}
