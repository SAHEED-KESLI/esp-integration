import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AxiosError } from 'axios';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    // Axios/network errors
    if (this.isAxiosError(exception)) {
      const axiosErr = exception as AxiosError;
      if (axiosErr.response) {
        status = axiosErr.response.status as number;
        message =
          axiosErr.response.data ||
          axiosErr.response.statusText ||
          axiosErr.message;
      } else if (axiosErr.code === 'ECONNABORTED') {
        status = HttpStatus.GATEWAY_TIMEOUT; // 504
        message = 'Timeout connecting to provider';
      } else {
        status = HttpStatus.BAD_GATEWAY; // 502
        message = axiosErr.message || 'Network error while contacting provider';
      }
      this.logger.warn(`Axios error: ${axiosErr.message}`);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exc = exception as HttpException;
      const response = exc.getResponse();
      message = response;
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = JSON.stringify(exception);
    }

    // Map some provider statuses to nicer messages
    if (status === 401 || status === 403) {
      message = message || 'Invalid credentials for provider';
    } else if (status === 429) {
      message = message || 'Provider rate limit exceeded';
    } else if (status === 502 || status === 503) {
      message = message || 'Provider is unavailable';
    }

    // Structured error response
    res.status(status).json({
      success: false,
      error: {
        statusCode: status,
        path: req.path,
        message,
      },
    });
  }

  private isAxiosError(err: any): err is AxiosError {
    return !!err && typeof err === 'object' && 'isAxiosError' in err;
  }
}
