import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        // if data already has success flag, don't double wrap
        if (data && typeof data === 'object' && 'success' in data) return data;
        return {
          success: true,
          provider: req.query?.provider ?? req.body?.provider ?? null,
          data,
        };
      }),
    );
  }
}
