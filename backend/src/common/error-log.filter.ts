import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Catch()
export class ErrorLogFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorLogFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? JSON.stringify(exception.getResponse())
        : exception instanceof Error
          ? exception.message
          : String(exception);

    const stack = exception instanceof Error ? exception.stack : undefined;

    // 500系のみ記録（4xxはユーザー操作起因なので不要）
    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
      this.prisma.errorLog
        .create({
          data: {
            method: req.method.slice(0, 10),
            url: req.url.slice(0, 500),
            status,
            message: message.slice(0, 5000),
            stack: stack?.slice(0, 5000),
          },
        })
        .catch((err) => this.logger.error('ErrorLog save failed', err));
    }

    res.status(status).json({
      statusCode: status,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    });
  }
}
