import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configurarApp } from './../src/configurar-app';
import { Jugador, Posicion } from './../src/jugadores/entities/jugador.entity';

/** Forma de error que devuelve la API, segun el contrato documentado. */
interface CuerpoDeError {
  statusCode: number;
  error: string;
  message: string[];
  path: string;
  timestamp: string;
}

/**
 * supertest tipa `body` como `any`. Este helper concentra la unica asercion
 * necesaria, en lugar de repetirla en cada prueba.
 */
function cuerpo<T>(respuesta: request.Response): T {
  return respuesta.body as T;
}

/**
 * Pruebas de extremo a extremo del recurso jugadores.
 *
 * La aplicacion se construye con `configurarApp`, la misma funcion que usa
 * `main.ts`, de modo que estas pruebas se ejecutan con la validacion y el
 * manejo de errores reales y no con una configuracion paralela.
 *
 * El plantel vive en memoria y la aplicacion se recrea antes de cada prueba,
 * asi que cada una parte de la semilla de 6 jugadores sin contaminarse con las
 * anteriores.
 */
describe('Jugadores (e2e)', () => {
  let app: INestApplication<App>;
  let servidor: App;

  /** Cuerpo valido reutilizable; el dorsal 73 esta libre en la semilla. */
  const nuevoJugador = {
    nombre: 'Rio Ngumoha',
    dorsal: 73,
    posicion: 'DELANTERO',
    edad: 18,
  };

  const UUID_INEXISTENTE = '99999999-9999-4999-8999-999999999999';

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    servidor = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  /** Ficha un jugador y devuelve el recurso creado. */
  const ficharJugador = async (datos = nuevoJugador): Promise<Jugador> =>
    cuerpo<Jugador>(
      await request(servidor).post('/jugadores').send(datos).expect(201),
    );

  describe('GET /jugadores', () => {
    it('devuelve 200 con el plantel ordenado por dorsal', async () => {
      const plantel = cuerpo<Jugador[]>(
        await request(servidor).get('/jugadores').expect(200),
      );

      expect(plantel).toHaveLength(6);
      expect(plantel.map((jugador) => jugador.dorsal)).toEqual([
        1, 4, 8, 10, 11, 26,
      ]);
    });

    it('filtra por nombre sin distinguir mayusculas', async () => {
      const encontrados = cuerpo<Jugador[]>(
        await request(servidor)
          .get('/jugadores')
          .query({ nombre: 'SALAH' })
          .expect(200),
      );

      expect(encontrados).toHaveLength(1);
      expect(encontrados[0].nombre).toBe('Mohamed Salah');
    });

    it('filtra por posicion', async () => {
      const defensas = cuerpo<Jugador[]>(
        await request(servidor)
          .get('/jugadores')
          .query({ posicion: Posicion.DEFENSA })
          .expect(200),
      );

      expect(defensas).toHaveLength(2);
      expect(
        defensas.every((jugador) => jugador.posicion === Posicion.DEFENSA),
      ).toBe(true);
    });

    it('sin coincidencias responde 200 con coleccion vacia, no 404', async () => {
      const vacio = cuerpo<Jugador[]>(
        await request(servidor)
          .get('/jugadores')
          .query({ nombre: 'zzzzz' })
          .expect(200),
      );

      expect(vacio).toEqual([]);
    });

    it('rechaza con 400 una posicion fuera del enum', () => {
      return request(servidor)
        .get('/jugadores')
        .query({ posicion: 'LATERAL' })
        .expect(400);
    });

    it('rechaza con 400 un parametro de query desconocido', () => {
      return request(servidor)
        .get('/jugadores')
        .query({ sueldo: 5000 })
        .expect(400);
    });
  });

  describe('GET /jugadores/:id', () => {
    it('devuelve 200 y el jugador solicitado', async () => {
      const creado = await ficharJugador();

      const obtenido = cuerpo<Jugador>(
        await request(servidor).get(`/jugadores/${creado.id}`).expect(200),
      );

      expect(obtenido).toEqual(creado);
    });

    it('devuelve 404 si el uuid no esta en el plantel', () => {
      return request(servidor)
        .get(`/jugadores/${UUID_INEXISTENTE}`)
        .expect(404);
    });

    it('devuelve 400 si el id no tiene formato uuid', () => {
      return request(servidor).get('/jugadores/no-es-un-uuid').expect(400);
    });
  });

  describe('POST /jugadores', () => {
    it('devuelve 201 con el recurso creado y su id', async () => {
      const creado = await ficharJugador();

      expect(creado.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(creado.nombre).toBe(nuevoJugador.nombre);
      // `goles` se omitio en el cuerpo: lo asume el servidor.
      expect(creado.goles).toBe(0);
    });

    it('devuelve 409 si el dorsal ya esta ocupado', async () => {
      const error = cuerpo<CuerpoDeError>(
        await request(servidor)
          .post('/jugadores')
          .send({ ...nuevoJugador, dorsal: 11 })
          .expect(409),
      );

      expect(error.message[0]).toContain('Mohamed Salah');
    });

    it('devuelve 400 si un campo tiene el tipo incorrecto', () => {
      return request(servidor)
        .post('/jugadores')
        .send({ ...nuevoJugador, edad: 'veinte' })
        .expect(400);
    });

    it('devuelve 400 si un valor esta fuera de rango', () => {
      return request(servidor)
        .post('/jugadores')
        .send({ ...nuevoJugador, dorsal: 150 })
        .expect(400);
    });

    it('devuelve 400 ante una propiedad desconocida', () => {
      return request(servidor)
        .post('/jugadores')
        .send({ ...nuevoJugador, sueldo: 5000 })
        .expect(400);
    });

    it('devuelve 400 si faltan campos obligatorios', () => {
      return request(servidor)
        .post('/jugadores')
        .send({ nombre: 'Solo Nombre' })
        .expect(400);
    });

    it('no permite que el cliente fije el id', () => {
      return request(servidor)
        .post('/jugadores')
        .send({ ...nuevoJugador, id: UUID_INEXISTENTE })
        .expect(400);
    });
  });

  describe('PATCH /jugadores/:id', () => {
    it('devuelve 200 y conserva los campos no enviados', async () => {
      const creado = await ficharJugador();

      const actualizado = cuerpo<Jugador>(
        await request(servidor)
          .patch(`/jugadores/${creado.id}`)
          .send({ goles: 4 })
          .expect(200),
      );

      expect(actualizado.goles).toBe(4);
      expect(actualizado.nombre).toBe(creado.nombre);
      expect(actualizado.edad).toBe(creado.edad);
    });

    it('devuelve 400 si el cuerpo esta vacio', async () => {
      const creado = await ficharJugador();

      return request(servidor)
        .patch(`/jugadores/${creado.id}`)
        .send({})
        .expect(400);
    });

    it('devuelve 409 al mover el jugador a un dorsal ocupado', async () => {
      const creado = await ficharJugador();

      return request(servidor)
        .patch(`/jugadores/${creado.id}`)
        .send({ dorsal: 11 })
        .expect(409);
    });

    it('permite conservar el propio dorsal', async () => {
      const creado = await ficharJugador();

      return request(servidor)
        .patch(`/jugadores/${creado.id}`)
        .send({ dorsal: creado.dorsal })
        .expect(200);
    });

    it('devuelve 404 si el uuid no existe', () => {
      return request(servidor)
        .patch(`/jugadores/${UUID_INEXISTENTE}`)
        .send({ goles: 1 })
        .expect(404);
    });
  });

  describe('PUT /jugadores/:id', () => {
    it('reemplaza el recurso completo y conserva el id', async () => {
      const creado = await ficharJugador();

      const reemplazado = cuerpo<Jugador>(
        await request(servidor)
          .put(`/jugadores/${creado.id}`)
          .send({
            nombre: 'Rio Ngumoha',
            dorsal: 73,
            posicion: Posicion.MEDIOCAMPISTA,
            edad: 19,
            goles: 5,
          })
          .expect(200),
      );

      expect(reemplazado.id).toBe(creado.id);
      expect(reemplazado.posicion).toBe(Posicion.MEDIOCAMPISTA);
      expect(reemplazado.goles).toBe(5);
    });

    it('devuelve 400 si se omite un campo: es un reemplazo total', async () => {
      const creado = await ficharJugador();

      return request(servidor)
        .put(`/jugadores/${creado.id}`)
        .send({
          nombre: 'Rio Ngumoha',
          dorsal: 73,
          posicion: Posicion.DELANTERO,
          edad: 19,
        })
        .expect(400);
    });
  });

  describe('DELETE /jugadores/:id', () => {
    it('devuelve 204 sin cuerpo y el recurso deja de existir', async () => {
      const creado = await ficharJugador();

      const respuesta = await request(servidor)
        .delete(`/jugadores/${creado.id}`)
        .expect(204);

      expect(respuesta.text).toBe('');

      await request(servidor).get(`/jugadores/${creado.id}`).expect(404);
    });

    it('devuelve 404 si el uuid no existe', () => {
      return request(servidor)
        .delete(`/jugadores/${UUID_INEXISTENTE}`)
        .expect(404);
    });
  });

  describe('Limite del plantel', () => {
    it('devuelve 409 al intentar fichar por encima de 25 jugadores', async () => {
      // La semilla trae 6: se completan hasta 25 y el siguiente debe chocar.
      for (let dorsal = 30; dorsal <= 48; dorsal += 1) {
        await request(servidor)
          .post('/jugadores')
          .send({
            nombre: `Suplente ${dorsal}`,
            dorsal,
            posicion: Posicion.DEFENSA,
            edad: 20,
          })
          .expect(201);
      }

      const error = cuerpo<CuerpoDeError>(
        await request(servidor)
          .post('/jugadores')
          .send({ ...nuevoJugador, dorsal: 99 })
          .expect(409),
      );

      expect(error.message[0]).toContain('25');
    });
  });

  describe('Formato de error', () => {
    it('mantiene la misma forma en todos los codigos de error', async () => {
      // Funciones y no promesas: supertest levanta y cierra el servidor en cada
      // peticion, asi que deben ejecutarse de a una y no crearse por adelantado.
      const casos = [
        () =>
          request(servidor).get(`/jugadores/${UUID_INEXISTENTE}`).expect(404),
        () => request(servidor).post('/jugadores').send({}).expect(400),
        () =>
          request(servidor)
            .post('/jugadores')
            .send({ ...nuevoJugador, dorsal: 11 })
            .expect(409),
      ];

      for (const caso of casos) {
        const error = cuerpo<CuerpoDeError>(await caso());

        expect(typeof error.statusCode).toBe('number');
        expect(typeof error.error).toBe('string');
        // `message` es siempre un arreglo, incluso con un solo motivo.
        expect(Array.isArray(error.message)).toBe(true);
        expect(typeof error.path).toBe('string');
        expect(typeof error.timestamp).toBe('string');
      }
    });
  });
});
