import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configurarApp, ORIGEN_FRONTEND } from './configurar-app';

const PUERTO = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validacion global y formato unico de error. Compartido con las pruebas e2e.
  configurarApp(app);

  // CORS para el origen exacto del frontend, nunca '*'.
  app.enableCors({
    origin: ORIGEN_FRONTEND,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  const configuracion = new DocumentBuilder()
    .setTitle('Plantel del Liverpool FC')
    .setDescription(
      'API HTTP validada sobre un unico recurso conservado en memoria. ' +
        'PUT se implementa como reemplazo completo: exige los cinco campos del modelo.',
    )
    .setVersion('1.0')
    .addTag('jugadores', 'Altas, bajas y modificaciones del plantel')
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, configuracion),
  );

  await app.listen(PUERTO);

  Logger.log(`API escuchando en http://localhost:${PUERTO}`, 'Bootstrap');
  Logger.log(
    `OpenAPI disponible en http://localhost:${PUERTO}/api/docs`,
    'Bootstrap',
  );
  Logger.log(`Origen autorizado por CORS: ${ORIGEN_FRONTEND}`, 'Bootstrap');
}

void bootstrap();
