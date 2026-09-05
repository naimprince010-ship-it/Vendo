import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type {
  ChangePasswordDto,
  CompletePasswordResetDto,
  LoginDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  roles: Array<{ id: string; key: string; name: string }>;
  permissions: string[];
  branchIds: string[];
}

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
}

const publicUserSelect = {
  id: true,
  companyId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  credentialVersion: true,
  userBranches: { select: { branchId: true } },
  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          key: true,
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  },
} as const;

type SelectedUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  private findActiveUser(companyId: string, userId: string) {
    return this.database.user.findFirst({
      where: { id: userId, companyId, status: 'ACTIVE' },
      select: publicUserSelect,
    });
  }

  private toPublicUser(user: NonNullable<SelectedUser>): PublicUser {
    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: user.userRoles.map(({ role }) => ({ id: role.id, key: role.key, name: role.name })),
      permissions: [
        ...new Set(
          user.userRoles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.key),
          ),
        ),
      ].sort(),
      branchIds: user.userBranches.map(({ branchId }) => branchId),
    };
  }

  private async resultFor(
    user: NonNullable<SelectedUser>,
    sessionId: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<AuthResult> {
    return {
      accessToken: await this.tokens.signAccessToken({
        userId: user.id,
        companyId: user.companyId,
        sessionId,
        credentialVersion: user.credentialVersion,
      }),
      accessTokenExpiresIn: this.tokens.accessTtlSeconds(),
      refreshToken,
      refreshTokenExpiresAt,
      user: this.toPublicUser(user),
    };
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResult> {
    const user = await this.database.user.findFirst({
      where: { email: dto.email, company: { code: dto.companyCode } },
      select: {
        ...publicUserSelect,
        passwordHash: true,
        status: true,
        lockedUntil: true,
        failedLoginCount: true,
      },
    });
    const passwordValid = await this.passwords.verify(user?.passwordHash, dto.password);
    const now = new Date();
    const unavailable =
      !user || user.status !== 'ACTIVE' || (user.lockedUntil?.getTime() ?? 0) > now.getTime();

    if (!passwordValid || unavailable) {
      if (user) {
        const failures = user.failedLoginCount + 1;
        await this.database.$transaction([
          this.database.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failures,
              lastFailedLoginAt: now,
              lockedUntil: failures >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : undefined,
            },
          }),
          this.database.auditLog.create({
            data: {
              companyId: user.companyId,
              actorId: user.id,
              action: 'auth.login.failure',
              entityType: 'User',
              entityId: user.id,
              reason: unavailable ? 'account_unavailable' : 'invalid_credentials',
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
            },
          }),
        ]);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = this.tokens.createOpaqueToken();
    const familyId = this.tokens.createFamilyId();
    const expiresAt = this.tokens.refreshExpiry(now);
    const session = await this.database.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null, lastLoginAt: now },
      });
      const created = await tx.authSession.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          familyId,
          refreshTokenHash: this.tokens.hashOpaqueToken(refreshToken),
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.id,
          action: 'auth.login.success',
          entityType: 'AuthSession',
          entityId: created.id,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      return created;
    });

    return this.resultFor(user, session.id, refreshToken, expiresAt);
  }

  async refresh(refreshToken: string | undefined, metadata: RequestMetadata): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException('Refresh session required');
    const tokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const existing = await this.database.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: { select: publicUserSelect } },
    });
    if (!existing) throw new UnauthorizedException('Refresh session is invalid');

    if (existing.revokedAt) {
      await this.database.$transaction([
        this.database.authSession.updateMany({
          where: { familyId: existing.familyId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'refresh_token_reuse' },
        }),
        this.database.auditLog.create({
          data: {
            companyId: existing.companyId,
            actorId: existing.userId,
            action: 'auth.refresh.reuse_detected',
            entityType: 'AuthSession',
            entityId: existing.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
        }),
      ]);
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const now = new Date();
    if (existing.expiresAt <= now || existing.user.status !== 'ACTIVE') {
      await this.database.authSession.update({
        where: { id: existing.id },
        data: { revokedAt: now, revokeReason: 'expired_or_inactive' },
      });
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const newRefreshToken = this.tokens.createOpaqueToken();
    const expiresAt = this.tokens.refreshExpiry(now);
    const successor = await this.database.$transaction(async (tx) => {
      const created = await tx.authSession.create({
        data: {
          companyId: existing.companyId,
          userId: existing.userId,
          familyId: existing.familyId,
          refreshTokenHash: this.tokens.hashOpaqueToken(newRefreshToken),
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      const updated = await tx.authSession.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: {
          revokedAt: now,
          revokeReason: 'rotated',
          replacedById: created.id,
          lastUsedAt: now,
        },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh session is invalid');
      return created;
    });

    return this.resultFor(existing.user, successor.id, newRefreshToken, expiresAt);
  }

  me(principal: AuthPrincipal): Promise<PublicUser> {
    return this.findActiveUser(principal.companyId, principal.userId).then((user) => {
      if (!user) throw new UnauthorizedException('Account is unavailable');
      return this.toPublicUser(user);
    });
  }

  async logout(principal: AuthPrincipal, metadata: RequestMetadata): Promise<void> {
    const now = new Date();
    await this.database.$transaction([
      this.database.authSession.updateMany({
        where: {
          id: principal.sessionId,
          userId: principal.userId,
          companyId: principal.companyId,
          revokedAt: null,
        },
        data: { revokedAt: now, revokeReason: 'logout' },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'auth.logout',
          entityType: 'AuthSession',
          entityId: principal.sessionId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    ]);
  }

  async logoutOtherSessions(principal: AuthPrincipal): Promise<{ revoked: number }> {
    const result = await this.database.$transaction(async (tx) => {
      const revoked = await tx.authSession.updateMany({
        where: {
          companyId: principal.companyId,
          userId: principal.userId,
          id: { not: principal.sessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date(), revokeReason: 'logout_others' },
      });
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'auth.sessions.others_revoked',
          entityType: 'User',
          entityId: principal.userId,
          newValue: { revokedCount: revoked.count },
        },
      });
      return revoked;
    });
    return { revoked: result.count };
  }

  async changePassword(
    principal: AuthPrincipal,
    dto: ChangePasswordDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.user.findFirst({
      where: { id: principal.userId, companyId: principal.companyId, status: 'ACTIVE' },
      select: { passwordHash: true },
    });
    if (!user || !(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is invalid');
    }
    const passwordHash = await this.passwords.hash(dto.newPassword);
    const now = new Date();
    await this.database.$transaction([
      this.database.user.update({
        where: { id: principal.userId },
        data: { passwordHash, passwordChangedAt: now, credentialVersion: { increment: 1 } },
      }),
      this.database.authSession.updateMany({
        where: { userId: principal.userId, companyId: principal.companyId, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'password_changed' },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'auth.password.changed',
          entityType: 'User',
          entityId: principal.userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    ]);
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.database.user.findFirst({
      where: { email: dto.email, status: 'ACTIVE', company: { code: dto.companyCode } },
      select: { id: true, companyId: true },
    });
    if (!user) return;
    const token = this.tokens.createOpaqueToken();
    await this.database.passwordResetToken.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        tokenHash: this.tokens.hashOpaqueToken(token),
        expiresAt: this.tokens.passwordResetExpiry(),
        ipAddress: metadata.ipAddress,
      },
    });
    // Delivery is intentionally delegated to a future configured notifier; never log or return token.
    void this.config.get<string>('PASSWORD_RESET_DELIVERY_PROVIDER');
  }

  async completePasswordReset(
    dto: CompletePasswordResetDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    const tokenHash = this.tokens.hashOpaqueToken(dto.token);
    const reset = await this.database.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE', company: { code: dto.companyCode } },
      },
    });
    if (!reset) throw new UnauthorizedException('Password reset token is invalid or expired');
    const passwordHash = await this.passwords.hash(dto.newPassword);
    const now = new Date();
    await this.database.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1)
        throw new UnauthorizedException('Password reset token is invalid or expired');
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, passwordChangedAt: now, credentialVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: reset.userId, companyId: reset.companyId, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'password_reset' },
      });
      await tx.auditLog.create({
        data: {
          companyId: reset.companyId,
          actorId: reset.userId,
          action: 'auth.password.reset',
          entityType: 'User',
          entityId: reset.userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
    });
  }
}
