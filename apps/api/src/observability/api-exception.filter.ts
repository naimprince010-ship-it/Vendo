import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../authorization/authenticated-request';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const safe =
      status < 500 && exception instanceof HttpException
        ? exception.getResponse()
        : status === 503
          ? 'Service unavailable'
          : 'Internal server error';
    const body =
      typeof safe === 'string'
        ? { statusCode: status, message: safe }
        : { ...(safe as Record<string, unknown>), statusCode: status };

    if (status >= 500) {
      process.stderr.write(
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          event: 'http.request.failed',
          requestId: request.requestId,
          method: request.method,
          route: request.originalUrl.split('?')[0],
          status,
          exception: exception instanceof Error ? exception.name : 'UnknownError',
        })}\n`,
      );
    }

    response.status(status).json({ ...body, requestId: request.requestId });
  }
}
