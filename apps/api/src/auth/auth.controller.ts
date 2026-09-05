import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../authorization/current-user.decorator';
import { Public } from '../authorization/public.decorator';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { AuthService, type AuthResult, type RequestMetadata } from './auth.service';
import {
  ChangePasswordDto,
  CompletePasswordResetDto,
  LoginDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';

const REFRESH_COOKIE = 'vendo_refresh';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private metadata(request: Request): RequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent')?.slice(0, 1000),
    };
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  private responseBody(
    result: AuthResult,
  ): Omit<AuthResult, 'refreshToken' | 'refreshTokenExpiresAt'> {
    return {
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, this.metadata(request));
    this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return this.responseBody(result);
  }

  @Public()
  @ApiCookieAuth(REFRESH_COOKIE)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const result = await this.auth.refresh(cookies?.[REFRESH_COOKIE], this.metadata(request));
    this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return this.responseBody(result);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() principal: AuthPrincipal) {
    return this.auth.me(principal);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(principal, this.metadata(request));
    this.clearRefreshCookie(response);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Other active sessions revoked' })
  @Post('logout-others')
  logoutOthers(@CurrentUser() principal: AuthPrincipal) {
    return this.auth.logoutOtherSessions(principal);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('change-password')
  async changePassword(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.changePassword(principal, dto, this.metadata(request));
    this.clearRefreshCookie(response);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('password-reset/request')
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    await this.auth.requestPasswordReset(dto, this.metadata(request));
    return { message: 'If the account is eligible, password reset instructions will be sent.' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('password-reset/complete')
  completePasswordReset(@Body() dto: CompletePasswordResetDto, @Req() request: Request) {
    return this.auth.completePasswordReset(dto, this.metadata(request));
  }
}
