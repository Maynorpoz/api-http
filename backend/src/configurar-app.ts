import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';

/** Unico origen autorizado: el frontend de desarrollo. */
export const ORIGEN_FRONTEND =
  process.env.ORIGEN_FRONTEND ?? 'http://localhost:5173';

/**
 * Aplica la configuracion transversal de la aplicacion.
 *
 * Vive aqui, y no dentro de `bootstrap`, para que las pruebas e2e levanten la
 * aplicacion con exactamente la misma validacion y el mismo manejo de errores
 * que produccion. Si estuviera duplicada, una prueba podria pasar con reglas
 * distintas a las reales.
 */
export function configurarApp(app: INestApplication): void {
  // Validacion de entrada para toda la aplicacion.
  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta cualquier propiedad que no este declarada en el DTO.
      whitelist: true,
      // Y si llega una propiedad desconocida, responde 400 en lugar de ignorarla.
      forbidNonWhitelisted: true,
      // Convierte el cuerpo plano en una instancia del DTO.
      transform: true,
      transformOptions: {
        // Sin conversion implicita: "veinte" no se vuelve numero, por lo que un
        // tipo incorrecto se detecta y responde 400.
        enableImplicitConversion: false,
      },
    }),
  );

  // Una sola forma de respuesta de error en toda la API.
  app.useGlobalFilters(new HttpExceptionFilter());
}
