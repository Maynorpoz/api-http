import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ApiError } from './api-error.schema';

/**
 * Normaliza toda respuesta de error a una unica forma.
 *
 * Los controladores y servicios solo lanzan excepciones estandar; dar formato a
 * la respuesta es responsabilidad de este filtro. Aqui si se usa el objeto
 * `response`, porque es el mecanismo que NestJS provee para los filtros: lo que
 * se evita es construir la respuesta con @Res() dentro de un handler.
 *
 * @Catch() sin argumentos captura tambien lo inesperado, de modo que ni un error
 * no previsto rompe el contrato de errores.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const response = contexto.getResponse<Response>();
    const request = contexto.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error('Excepcion no controlada', exception as Error);
    }

    const cuerpo: ApiError = {
      statusCode: status,
      error: HttpExceptionFilter.nombreDelError(exception, status),
      message: HttpExceptionFilter.motivos(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(cuerpo);
  }

  /**
   * Unifica los motivos en un arreglo.
   *
   * El ValidationPipe ya entrega un arreglo de mensajes; las excepciones
   * estandar entregan una sola cadena.
   */
  private static motivos(exception: unknown): string[] {
    if (!(exception instanceof HttpException)) {
      return ['Error interno del servidor'];
    }

    const respuesta = exception.getResponse();

    if (typeof respuesta === 'string') {
      return [respuesta];
    }

    const mensaje = (respuesta as { message?: string | string[] }).message;

    if (Array.isArray(mensaje)) {
      return mensaje;
    }

    return [mensaje ?? exception.message];
  }

  private static nombreDelError(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();

      if (typeof respuesta === 'object') {
        const nombre = (respuesta as { error?: string }).error;

        if (nombre) {
          return nombre;
        }
      }
    }

    return STATUS_CODES[status] ?? 'Error';
  }
}
