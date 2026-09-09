import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../authorization/authenticated-request';

const REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const supplied = request.get('x-request-id');
    const requestId = supplied && REQUEST_ID.test(supplied) ? supplied : randomUUID();
    const startedAt = process.hrtime.bigint();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const event = {
          timestamp: new Date().toISOString(),
          level:
            response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
          event: 'http.request.completed',
          requestId,
          method: request.method,
          route: request.originalUrl.split('?')[0],
          status: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          userId: request.principal?.userId,
          companyId: request.principal?.companyId,
          branchId: request.activeBranch?.id,
        };
        process.stdout.write(`${JSON.stringify(event)}\n`);
      }),
    );
  }
}
