# API HTTP validada — Plantel del Liverpool FC

API HTTP construida con **NestJS** y consumida por una interfaz en **React**.
El proyecto demuestra arquitectura en capas, semántica HTTP correcta, validación
de entrada y manejo consistente de errores. **No utiliza base de datos**: los
datos se conservan en memoria.

> **Estado:** implementado y verificado. 140 comprobaciones automáticas en verde
> (27 e2e con Jest + 47 de contrato HTTP + 20 de integración + 46 de interfaz
> sobre un navegador real). Ver [sección 9](#9-pruebas).

---

## Contenido

1. [Puesta en marcha](#1-puesta-en-marcha) — **instrucciones de ejecución**
2. [Decisión de diseño](#2-decisión-de-diseño)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Contrato HTTP](#4-contrato-http) — **rutas disponibles**
   - [Códigos de estado utilizados](#códigos-de-estado-utilizados)
   - [Búsqueda y filtros](#búsqueda-y-filtros)
5. [Formato único de error](#5-formato-único-de-respuesta-de-error)
6. [Reglas de negocio](#6-reglas-de-negocio-que-producen-409-conflict)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Matriz de demostración](#8-matriz-de-demostración)
9. [Pruebas](#9-pruebas)
10. [Trazabilidad de requisitos](#10-trazabilidad-de-requisitos)
11. [Decisiones de implementación](#11-decisiones-de-implementación)

---

## 1. Puesta en marcha

**Requisitos:** Node.js 20 o superior y npm. (Desarrollado con Node 24 y npm 11.)

### 1. Instalar dependencias

Son dos proyectos independientes, cada uno con su `package.json`:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### 2. Ejecutar

Los dos proyectos corren en paralelo, en dos terminales:

```bash
# Terminal 1 — API
cd backend
npm run start:dev      # http://localhost:3000

# Terminal 2 — interfaz
cd frontend
npm run dev            # http://localhost:5173
```

Con ambos levantados, la aplicación se abre en **http://localhost:5173** y la
documentación interactiva en **http://localhost:3000/api/docs**.

### Si el puerto 3000 está ocupado

Ambos puertos son configurables. En la máquina de desarrollo el 3000 estaba
tomado por Docker Desktop, así que conviene conocer la alternativa:

```bash
# API en otro puerto
cd backend
PORT=3001 npm run start:dev

# y el frontend apuntando ahí
cd frontend
cp .env.example .env.local     # editar VITE_API_URL=http://localhost:3001
npm run dev
```

`.env.local` está excluido del control de versiones (`*.local` en el
`.gitignore`), así que cada quien crea el suyo a partir de `.env.example` si lo
necesita. Vite lee las variables al arrancar: después de tocarlas hay que
reiniciar `npm run dev`.

Para liberar el 3000 en lugar de cambiarlo, basta detener el contenedor que lo
publica (`docker ps` para identificarlo).

Variables disponibles:

| Variable | Proyecto | Valor por defecto |
|----------|----------|-------------------|
| `PORT` | backend | `3000` |
| `ORIGEN_FRONTEND` | backend | `http://localhost:5173` |
| `VITE_API_URL` | frontend | `http://localhost:3000` |

### Direcciones

| Servicio | URL |
|----------|-----|
| Interfaz | `http://localhost:5173` |
| API | `http://localhost:3000` |
| OpenAPI (Swagger UI) | `http://localhost:3000/api/docs` |
| Especificación OpenAPI | `http://localhost:3000/api/docs-json` |

---

## 2. Decisión de diseño

**Recurso único:** `jugadores` — el plantel del Liverpool FC.

El club no se modela como entidad: es el contexto implícito de toda la API.
Esto mantiene un solo módulo de característica, sin rutas anidadas y sin `404`
ambiguos (donde no se sabría si falta el equipo o el jugador).

---

## 3. Modelo de datos

| Campo | Tipo | Reglas de validación | Obligatorio |
|-------|------|----------------------|-------------|
| `id` | `uuid` | Generado por el servidor; enviarlo da `400` | — |
| `nombre` | `string` | 3–60 caracteres | Sí |
| `dorsal` | `int` | 1–99, **único en el plantel** | Sí |
| `posicion` | `enum` | `ARQUERO` · `DEFENSA` · `MEDIOCAMPISTA` · `DELANTERO` | Sí |
| `edad` | `int` | 16–45 | Sí |
| `goles` | `int` | Mayor o igual a 0; si se omite, el servidor asume `0` | No |

---

## 4. Contrato HTTP

| Método | Ruta | Éxito | Errores | Justificación del código |
|--------|------|-------|---------|--------------------------|
| `GET` | `/jugadores` | `200` | `400` | Admite los filtros `?nombre=` y `?posicion=`. La colección siempre existe; si nada coincide devuelve `[]`, no `404` |
| `GET` | `/jugadores/:id` | `200` | `400` `404` | `400` si el id no es UUID; `404` si no está en el plantel |
| `POST` | `/jugadores` | `201` | `400` `409` | Recurso creado; devuelve el jugador con su `id` |
| `PATCH` | `/jugadores/:id` | `200` | `400` `404` `409` | Modificación parcial; devuelve el jugador actualizado |
| `PUT` | `/jugadores/:id` | `200` | `400` `404` `409` | **Opcional** — reemplazo total, ver abajo |
| `DELETE` | `/jugadores/:id` | `204` | `400` `404` | No hay contenido que devolver |

La respuesta de `GET /jugadores` viene ordenada por dorsal.

### Códigos de estado utilizados

| Código | Significado | Cuándo lo devuelve esta API |
|--------|-------------|------------------------------|
| `200 OK` | Lectura o modificación correcta; el cuerpo trae el recurso | `GET` de colección y de detalle, `PATCH`, `PUT` |
| `201 Created` | Recurso creado; el cuerpo trae el jugador con el `id` que generó el servidor | `POST` |
| `204 No Content` | Operación correcta sin contenido que devolver | `DELETE` |
| `400 Bad Request` | La petición del cliente es inválida: tipo incorrecto, valor fuera de rango, valor fuera del enum, propiedad desconocida, cuerpo vacío en `PATCH`, `id` que no es UUID o parámetro de query inválido | Todas las rutas |
| `404 Not Found` | El `id` tiene formato válido pero no hay ningún jugador con ese `id` | `GET` de detalle, `PATCH`, `PUT`, `DELETE` |
| `409 Conflict` | La petición choca con el estado actual del plantel: dorsal ya ocupado, o plantel completo (25 jugadores) | `POST`, `PATCH`, `PUT` |

**`500` no se usa.** No hay ningún endpoint que fabrique un error de servidor, y
los casos que podrían provocarlo están cubiertos: el `ParseUUIDPipe` rechaza los
`id` malformados con `400`, y el filtro global captura cualquier excepción
imprevista para devolverla con el formato documentado en la sección 5.

### Búsqueda y filtros

`GET /jugadores` admite dos parámetros opcionales de query, validados por el
mismo `ValidationPipe` global que valida los cuerpos:

| Parámetro | Validación | Ejemplo |
|-----------|-----------|---------|
| `nombre` | Cadena de hasta 60 caracteres. Coincidencia parcial, sin distinguir mayúsculas ni acentos | `?nombre=sal` → Mohamed Salah |
| `posicion` | Valor exacto del enum | `?posicion=DEFENSA` → van Dijk y Robertson |

Se combinan: `?nombre=van&posicion=DEFENSA`.

Decisiones:

- **Un `?nombre=` vacío equivale a no filtrar.** Un `@Transform` lo convierte a
  `undefined` antes de validar, de modo que la cadena vacía no se interpreta como
  una búsqueda de la cadena vacía.
- **Sin coincidencias es `200` con `[]`, nunca `404`.** La colección existe; que
  esté vacía es un resultado legítimo, no un recurso ausente.
- **Una posición fuera del enum da `400`**, igual que en el cuerpo.
- **Un parámetro desconocido da `400`**, porque `forbidNonWhitelisted` también
  alcanza a la query: `?sueldo=5000` se rechaza.
- **La búsqueda la resuelve el servidor.** El frontend manda la query string y
  muestra lo que recibe; no filtra el arreglo en el navegador. Por eso la UI
  sigue reflejando exactamente la respuesta de la API.

### `PUT` como reemplazo completo

`PUT` se implementa con semántica de **reemplazo total**: exige los cinco campos
del modelo y sustituye el recurso completo, preservando únicamente el `id`.
Omitir un campo devuelve `400`, no "dejarlo como estaba" — por eso `goles` es
obligatorio en `PUT` aunque sea opcional en `POST`.

`PATCH` es el único método que acepta subconjuntos de campos. Un cuerpo vacío
(`{}`) devuelve `400`: una petición que no modifica nada no es una modificación
válida.

---

## 5. Formato único de respuesta de error

Un `HttpExceptionFilter` global **normaliza** la salida de las excepciones
estándar de NestJS (`NotFoundException`, `ConflictException`,
`BadRequestException`). Los servicios y controladores solo lanzan excepciones:
ninguno construye su respuesta con `@Res()`.

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": ["El dorsal 11 ya esta asignado a Mohamed Salah"],
  "path": "/jugadores",
  "timestamp": "2026-10-07T01:49:13.280Z"
}
```

`message` es **siempre un arreglo**, incluso con un solo motivo, para que el
frontend lo renderice de una única forma. El filtro usa `@Catch()` sin
argumentos, de modo que ni un error imprevisto rompe el contrato.

---

## 6. Reglas de negocio que producen `409 Conflict`

1. **Dorsal duplicado** — al fichar (`POST`) y también al intentar mover un
   jugador a un dorsal ya ocupado (`PATCH` / `PUT`). Un jugador sí puede
   "conservar" su propio dorsal en una edición.
2. **Plantel completo** — máximo 25 jugadores; fichar al 26.º devuelve `409`.

### Datos iniciales

Seis jugadores sembrados en memoria, para que la interfaz no arranque vacía y
existan dorsales ocupados con los que provocar el `409`:

| Dorsal | Nombre | Posición |
|--------|--------|----------|
| 1 | Alisson Becker | `ARQUERO` |
| 4 | Virgil van Dijk | `DEFENSA` |
| 8 | Dominik Szoboszlai | `MEDIOCAMPISTA` |
| 10 | Alexis Mac Allister | `MEDIOCAMPISTA` |
| 11 | Mohamed Salah | `DELANTERO` |
| 26 | Andrew Robertson | `DEFENSA` |

Al reiniciar el servidor el plantel vuelve a este estado: los datos viven en un
`Map` en memoria, no hay persistencia.

---

## 7. Estructura del proyecto

```
api-http/
├─ backend/
│  └─ src/
│     ├─ main.ts                        # arranque: CORS, Swagger, puerto
│     ├─ configurar-app.ts              # ValidationPipe + filtro global (compartido con e2e)
│     ├─ app.module.ts
│     ├─ common/
│     │  ├─ http-exception.filter.ts    # normaliza todos los errores
│     │  └─ api-error.schema.ts         # documenta la forma del error en OpenAPI
│     └─ jugadores/
│        ├─ jugadores.module.ts
│        ├─ jugadores.controller.ts     # solo HTTP: rutas, códigos, pipes
│        ├─ jugadores.service.ts        # Map en memoria + reglas de negocio
│        ├─ entities/jugador.entity.ts  # modelo + enum Posicion
│        └─ dto/
│           ├─ create-jugador.dto.ts
│           ├─ update-jugador.dto.ts    # PartialType + "al menos un campo"
│           ├─ replace-jugador.dto.ts   # cuerpo de PUT
│           ├─ query-jugadores.dto.ts   # filtros de búsqueda
│           └─ at-least-one-field.validator.ts
│  └─ test/
│     └─ jugadores.e2e-spec.ts          # 27 comprobaciones con Jest + supertest
├─ frontend/
│  ├─ .env.example                      # VITE_API_URL
│  ├─ src/
│  │  ├─ api/
│  │  │  ├─ client.ts                   # fetch + 204 + parseo del error
│  │  │  └─ jugadores.api.ts            # una función por endpoint
│  │  ├─ hooks/useJugadores.ts          # estado: cargando | listo | error
│  │  ├─ components/
│  │  │  ├─ PlantelTable.tsx            # tabla, esqueleto, vacío, error
│  │  │  ├─ BuscadorPlantel.tsx         # búsqueda contra la API
│  │  │  ├─ JugadorForm.tsx             # fichaje
│  │  │  ├─ JugadorRow.tsx              # edición inline + baja confirmada
│  │  │  └─ Aviso.tsx                   # éxito / error con el código HTTP
│  │  ├─ types.ts                       # espejo del contrato
│  │  ├─ index.css
│  │  └─ App.tsx
│  └─ pruebas/
│     ├─ ui.mjs                         # 46 comprobaciones sobre Chrome real
│     └─ capturas/                      # evidencia en PNG (no se versiona)
├─ pruebas/
│  ├─ matriz-http.sh                    # 47 comprobaciones del contrato
│  └─ contrato-ui.sh                    # 20 comprobaciones de integración
└─ README.md
```

---

## 8. Matriz de demostración

Secuencia a recorrer durante la evaluación:

| Código | Cómo se provoca | Dónde se muestra |
|--------|-----------------|------------------|
| `200` | Listar el plantel | Swagger + UI |
| `201` | Fichar un jugador con dorsal libre | UI (formulario) |
| `200` | Sumar un gol con `PATCH` | UI (edición inline) |
| `204` | Dar de baja a un jugador | UI (botón Baja) |
| `400` tipo | `edad: "veinte"` | Swagger + UI |
| `400` rango | `dorsal: 150` · `edad: 12` | Swagger + UI |
| `400` enum | `posicion: "ARQUERO SUPLENTE"` | Swagger |
| `400` desconocido | Enviar `{ "sueldo": 5000 }` | Swagger |
| `400` vacío | `PATCH` con `{}` (botón Guardar sin tocar nada) | Swagger + UI |
| `400` id inválido | `GET /jugadores/no-es-un-uuid` | Swagger |
| `404` | `GET` con un UUID que no está en el plantel | Swagger + UI |
| `409` al crear | Fichar con el dorsal 11 (ocupado por Salah) | UI (banner) |
| `409` al editar | `PATCH` cambiando un dorsal a uno ocupado | Swagger + UI |
| `409` por cupo | Fichar al jugador 26 | Swagger |
| `200` búsqueda | Escribir `salah` en el buscador | UI |
| `200` sin resultados | Buscar `zzzz` → colección vacía, no `404` | UI |
| `400` query enum | `?posicion=LATERAL` | Swagger |
| `400` query extra | `?sueldo=5000` | Swagger |

**Detalle para mostrar los `400` desde la interfaz:** el formulario usa campos de
texto y no replica las validaciones del backend. Se puede escribir `veinte` en
la edad y ver la respuesta real de la API. La autoridad sobre qué es válido es el
servidor, no el navegador.

---

## 9. Pruebas

Cuatro suites. La primera es autónoma; las dos siguientes usan `curl` y
requieren la API levantada; la última maneja un Chrome real y requiere además
el dev server.

```bash
# 27 comprobaciones e2e con Jest y supertest: NO necesita nada levantado
cd backend && npm test

# 47 comprobaciones: cada código del contrato, búsqueda, CORS y la especificación OpenAPI
bash pruebas/matriz-http.sh

# 20 comprobaciones: la secuencia exacta que hace la interfaz, con su Origin
bash pruebas/contrato-ui.sh

# 46 comprobaciones: la interfaz real, con clics y capturas de pantalla
cd frontend && npm run test:ui

# Si la API corre en otro puerto
BASE=http://localhost:3001 bash pruebas/matriz-http.sh
```

La suite de interfaz usa `puppeteer-core` sobre el Chrome o Edge ya instalado en
la máquina (no descarga ningún navegador). Si no los encuentra, se le indica la
ruta con `CHROME_PATH`. Deja capturas en `frontend/pruebas/capturas/`.

> **Importante:** cada suite debe correr contra un servidor recién iniciado. Los
> datos están en memoria y `matriz-http.sh` completa el plantel hasta 25 para
> comprobar el límite, así que una segunda corrida sin reiniciar falla por
> estado acumulado, no por un defecto.

Qué cubre cada una:

| Suite | Verifica |
|-------|----------|
| `backend/test/jugadores.e2e-spec.ts` | Los seis códigos sobre la aplicación real levantada en memoria por Jest, incluidos los filtros de búsqueda, el límite de plantel y que la forma del error sea idéntica en `400`, `404` y `409`. Recrea la aplicación antes de cada prueba, así que cada caso parte de la semilla limpia |
| `matriz-http.sh` | Los seis códigos, los casos de `400` (cuerpo y query), los tres de `409`, los filtros de búsqueda, que el `204` no traiga cuerpo, que CORS no use `*` ni refleje un origen ajeno, y que OpenAPI documente las 6 operaciones, los schemas y los 6 códigos |
| `contrato-ui.sh` | El recorrido de la interfaz con `Origin: http://localhost:5173`: carga inicial, fichaje, error que conserva el formulario, `PATCH` parcial que preserva los campos no enviados, baja tras el `204`, y el preflight de los cuatro métodos de escritura |
| `frontend/pruebas/ui.mjs` | La interfaz real en Chrome: que la tabla pinte la semilla ordenada, el buscador contra la API (por nombre, por posición, sin resultados y al limpiar), el `201` desde el formulario, el banner de `409` conservando los datos tecleados, el `400` por tipo inválido, la edición inline, el `400` por cuerpo vacío, la confirmación previa a la baja y la fila que desaparece solo tras el `204`. Además el esqueleto de carga, el estado de API caída, el ancho de teléfono sin desborde y la consola sin errores |

Resultado de la última ejecución: **27/27**, **47/47**, **20/20** y **46/46**.
Ambos proyectos compilan sin errores de TypeScript y pasan sus linters.

Las pruebas e2e construyen la aplicación con `configurarApp()`, la misma función
que usa `main.ts`. Si estuviera duplicada, una prueba podría pasar con reglas de
validación distintas a las reales.

La suite de interfaz encontró dos defectos reales de maquetación que ya están
corregidos: la tabla ensanchaba la página en pantallas angostas (un ítem de grid
no baja de su contenido sin `min-width: 0`) y los bordes de fila se cortaban
porque la celda de acciones tenía `display: flex`, lo que la saca del layout de
tabla.

---

## 10. Trazabilidad de requisitos

| Requisito | Dónde se cumple |
|-----------|-----------------|
| Módulo con controlador, servicio y DTO | `backend/src/jugadores/` |
| Datos conservados en memoria | `Map` privado en `jugadores.service.ts` |
| `GET` colección y detalle, `POST`, `PATCH`, `DELETE` | `jugadores.controller.ts` |
| `PUT` opcional documentado como reemplazo | Sección 4 y `@ApiOperation` del método |
| `ValidationPipe` global con las tres opciones | `main.ts` |
| Excepciones estándar, sin `@Res()` | El servicio lanza, el filtro normaliza |
| CORS para el origen exacto del frontend | `main.ts`, `origin: ORIGEN_FRONTEND` |
| Documentación OpenAPI accesible | `/api/docs` |
| Uso justificado de 200/201/204/400/404/409 | Secciones 4 y 8 |
| Respuestas de error consistentes | Sección 5 |
| No fabricar un error `500` | Sección 11, puntos 1 y 2 |
| React: ver, crear, actualizar y eliminar | `App.tsx` y `components/` |
| Estados de carga, éxito y error | `useJugadores.ts` + `Aviso.tsx` + esqueleto |
| Actualizar la UI con la respuesta confirmada | Sección 11, punto 5 |

---

## 11. Decisiones de implementación

1. **`ParseUUIDPipe` en todos los `:id`.** Un id malformado se rechaza con `400`
   antes de llegar al servicio. Sin esto, un id raro podría derivar en un error
   no controlado y devolver `500`, justo lo que el enunciado prohíbe.

2. **`@Catch()` sin argumentos en el filtro.** Captura también lo imprevisto, así
   que incluso un error no contemplado responde con la forma documentada en lugar
   de con el `500` por defecto de NestJS.

3. **Sin conversión implícita de tipos.** `transformOptions.enableImplicitConversion`
   queda en `false`. Si estuviera activada, `edad: "20"` se convertiría
   silenciosamente a `20` y el caso de "tipo incorrecto" nunca daría `400`.

4. **`PATCH` rechaza el cuerpo vacío.** `PartialType` lo acepta por defecto; un
   decorador de clase (`AtLeastOneField`) lo impide, con una comprobación
   equivalente en el servicio como red de seguridad.

5. **La interfaz no adivina.** El estado local se actualiza con el objeto que
   devuelve la API (`201` / `200`); en la baja la fila se elimina solo después de
   recibir el `204`. Sin actualizaciones optimistas.

6. **El `PATCH` de la edición inline envía solo los campos modificados**, que es
   la semántica del método. Si no se tocó nada, se envía el cuerpo vacío y se
   muestra el `400` que responde la API.

7. **CORS con origen exacto.** Mismo esquema, host y puerto, nunca `*`. Con un
   origen fijo, el middleware responde siempre ese valor y jamás refleja el del
   solicitante: un origen ajeno recibe la cabecera del frontend y el navegador lo
   bloquea.

8. **No se usa `@Res()` en ningún handler.** El `POST` por lo tanto no envía la
   cabecera `Location`, que requeriría acceso al objeto de respuesta; el recurso
   creado viaja completo en el cuerpo, con su `id`.
