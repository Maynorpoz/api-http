/**
 * Verificacion de la interfaz con un Chrome real.
 *
 * Comprueba lo que las pruebas de contrato no pueden ver: que los clics
 * produzcan los estados correctos en pantalla, que el estado local se actualice
 * con la respuesta de la API y que los errores del servidor se muestren.
 *
 * Requiere la API y el dev server levantados.
 *   node pruebas/ui.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const UI = process.env.UI_URL ?? 'http://localhost:5173'
const CAPTURAS = 'pruebas/capturas'

const CANDIDATOS_CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)

let pass = 0
let fail = 0
const fallos = []

function ok(texto) {
  pass += 1
  console.log(`PASS  ${texto}`)
}

function mal(texto, detalle) {
  fail += 1
  fallos.push(texto)
  console.log(`FAIL  ${texto}`)
  if (detalle !== undefined) console.log(`      ${detalle}`)
}

function comprobar(condicion, texto, detalle) {
  if (condicion) ok(texto)
  else mal(texto, detalle)
}

/** Clic en el primer elemento cuyo texto coincide, dentro de un contenedor. */
async function clicPorTexto(contexto, selector, texto) {
  const elementos = await contexto.$$(selector)

  for (const elemento of elementos) {
    const contenido = await elemento.evaluate((el) => el.textContent?.trim() ?? '')
    if (contenido === texto || contenido.startsWith(texto)) {
      await elemento.click()
      return true
    }
  }

  return false
}

/** Lee la tabla tal como la ve el usuario. */
function leerFilas(page) {
  return page.$$eval('.tabla tbody tr', (filas) =>
    filas.map((fila) => {
      const celdas = [...fila.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '')
      return { dorsal: celdas[0], nombre: celdas[1], posicion: celdas[2], edad: celdas[3], goles: celdas[4] }
    }),
  )
}

/** La fila (tr) que contiene a un jugador por nombre. */
async function filaDe(page, nombre) {
  const filas = await page.$$('.tabla tbody tr')

  for (const fila of filas) {
    const texto = await fila.evaluate((el) => el.textContent ?? '')
    if (texto.includes(nombre)) return fila
  }

  return null
}

/** Texto del aviso visible, con el codigo que muestra el icono. */
async function leerAviso(page) {
  return page.evaluate(() => {
    const aviso = document.querySelector('.aviso')
    if (!aviso) return null

    return {
      tipo: aviso.classList.contains('aviso--exito') ? 'exito' : 'error',
      codigo: aviso.querySelector('.aviso__icono')?.textContent?.trim() ?? '',
      texto: aviso.querySelector('.aviso__texto')?.textContent?.trim() ?? '',
      motivos: [...aviso.querySelectorAll('.aviso__motivos li')].map((li) => li.textContent?.trim()),
    }
  })
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Reemplaza el contenido de un campo.
 *
 * El triple clic no selecciona de forma fiable en todos los casos, asi que se
 * selecciona el rango explicitamente antes de borrar.
 */
async function vaciarYEscribir(campo, valor) {
  await campo.click()
  await campo.evaluate((el) => el.setSelectionRange(0, el.value.length))
  await campo.press('Backspace')
  await campo.type(valor)
}

async function escribir(page, selector, valor) {
  await vaciarYEscribir(await page.$(selector), valor)
}

async function completarFormulario(page, { nombre, dorsal, posicion, edad, goles }) {
  await escribir(page, 'input[placeholder="Cody Gakpo"]', nombre)
  await escribir(page, 'input[placeholder="18"]', dorsal)
  await escribir(page, 'input[placeholder="27"]', edad)
  if (goles !== undefined) await escribir(page, 'input[placeholder="0"]', goles)
  if (posicion !== undefined) await page.select('.ficha select', posicion)
}

async function capturar(page, nombre) {
  await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

async function main() {
  const ejecutable = CANDIDATOS_CHROME.find((ruta) => existsSync(ruta))

  if (!ejecutable) {
    console.error('No se encontro Chrome ni Edge. Defini CHROME_PATH.')
    process.exit(2)
  }

  await mkdir(CAPTURAS, { recursive: true })
  console.log(`Navegador: ${ejecutable}`)
  console.log(`Interfaz:  ${UI}\n`)

  const browser = await puppeteer.launch({ executablePath: ejecutable, headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const erroresDeConsola = []
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresDeConsola.push(mensaje.text())
  })
  page.on('pageerror', (error) => erroresDeConsola.push(String(error)))

  try {
    // ---------- 1. Carga inicial ----------
    console.log('=== 1. Carga inicial ===')
    await page.goto(UI, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.tabla tbody tr', { timeout: 10000 })

    const titulo = await page.title()
    comprobar(titulo === 'Plantel del Liverpool FC', `titulo de la pestania: "${titulo}"`)

    const iniciales = await leerFilas(page)
    comprobar(iniciales.length === 6, `la tabla renderiza ${iniciales.length} filas (semilla de 6)`)

    const dorsales = iniciales.map((f) => f.dorsal).join(',')
    comprobar(dorsales === '1,4,8,10,11,26', `ordenadas por dorsal: ${dorsales}`)

    const salah = iniciales.find((f) => f.nombre === 'Mohamed Salah')
    comprobar(salah?.dorsal === '11' && salah?.posicion === 'DELANTERO', 'Salah aparece con dorsal 11 y DELANTERO')

    const chip = await page.$eval('.chip', (el) => el.textContent.trim())
    comprobar(chip === '6 / 25 jugadores', `contador de plantel: "${chip}"`)

    await capturar(page, '01-carga-inicial')

    // ---------- 1b. Buscador ----------
    console.log('\n=== 1b. Busqueda contra la API ===')

    const buscar = async (texto) => {
      await vaciarYEscribir(await page.$('input[aria-label="Buscar por nombre"]'), texto)
      await esperar(700) // supera el debounce de 250 ms
    }

    await buscar('salah')
    const porNombre = await leerFilas(page)
    comprobar(porNombre.length === 1, `buscar "salah" deja ${porNombre.length} fila`)
    comprobar(porNombre[0]?.nombre === 'Mohamed Salah', `encuentra a ${porNombre[0]?.nombre}`)

    const estadoBusqueda = await page.$eval('.buscador__estado', (el) => el.textContent.trim())
    comprobar(estadoBusqueda === '1 resultado para el filtro', `informa: "${estadoBusqueda}"`)
    await capturar(page, '01b-busqueda-nombre')

    await buscar('SALAH')
    comprobar((await leerFilas(page)).length === 1, 'la busqueda no distingue mayusculas')

    await buscar('zzzzz')
    await page.waitForSelector('.vacio__titulo', { timeout: 5000 })
    const vacio = await page.$eval('.vacio__titulo', (el) => el.textContent.trim())
    comprobar(
      vacio === 'Ningun jugador coincide con la busqueda',
      `sin resultados muestra el mensaje correcto: "${vacio}"`,
    )
    const textoVacio = await page.$eval('.vacio__texto', (el) => el.textContent)
    comprobar(textoVacio.includes('200'), 'explica que la API respondio 200 con coleccion vacia')
    await capturar(page, '01c-sin-resultados')

    await buscar('')
    comprobar((await leerFilas(page)).length === 6, 'al vaciar la busqueda vuelve el plantel completo')

    await page.select('select[aria-label="Filtrar por posicion"]', 'DEFENSA')
    await esperar(700)
    const defensas = await leerFilas(page)
    comprobar(defensas.length === 2, `filtrar por DEFENSA deja ${defensas.length} filas`)
    comprobar(
      defensas.every((f) => f.posicion === 'DEFENSA'),
      'todas las filas devueltas son defensas',
    )
    await capturar(page, '01d-filtro-posicion')

    comprobar(
      await clicPorTexto(page, '.buscador button', 'Limpiar'),
      'el boton Limpiar aparece con el filtro activo',
    )
    await esperar(700)
    comprobar((await leerFilas(page)).length === 6, 'Limpiar restaura el plantel completo')

    // ---------- 2. Fichaje (201) ----------
    console.log('\n=== 2. Fichaje desde el formulario (201) ===')
    await completarFormulario(page, {
      nombre: 'Rio Ngumoha',
      dorsal: '73',
      posicion: 'DELANTERO',
      edad: '18',
    })
    await clicPorTexto(page, '.ficha button', 'Fichar')
    await page.waitForSelector('.aviso--exito', { timeout: 10000 })

    const avisoExito = await leerAviso(page)
    comprobar(avisoExito.codigo === 'OK', 'el banner de exito se muestra')
    comprobar(avisoExito.texto.includes('201'), `el aviso declara el codigo: "${avisoExito.texto}"`)

    const trasFichaje = await leerFilas(page)
    comprobar(trasFichaje.length === 7, `la tabla pasa a ${trasFichaje.length} filas`)

    const nuevo = trasFichaje.find((f) => f.nombre === 'Rio Ngumoha')
    comprobar(nuevo !== undefined, 'la fila nueva aparece en la tabla')
    comprobar(nuevo?.goles === '0', `goles llega en 0 desde la API, no inventado por la UI (${nuevo?.goles})`)

    const nombreTrasExito = await page.$eval('input[placeholder="Cody Gakpo"]', (el) => el.value)
    comprobar(nombreTrasExito === '', 'el formulario se limpia tras el 201')

    await capturar(page, '02-tras-fichaje')

    // ---------- 3. Conflicto (409) ----------
    console.log('\n=== 3. Dorsal ocupado (409) ===')
    await completarFormulario(page, {
      nombre: 'Impostor Salah',
      dorsal: '11',
      posicion: 'DELANTERO',
      edad: '30',
    })
    await clicPorTexto(page, '.ficha button', 'Fichar')
    await page.waitForSelector('.aviso--error', { timeout: 10000 })

    const aviso409 = await leerAviso(page)
    comprobar(aviso409.codigo === '409', `el banner muestra el codigo ${aviso409.codigo}`)
    comprobar(
      aviso409.motivos.some((m) => m.includes('Mohamed Salah')),
      `el motivo nombra al ocupante: "${aviso409.motivos[0]}"`,
    )

    const nombreTras409 = await page.$eval('input[placeholder="Cody Gakpo"]', (el) => el.value)
    comprobar(nombreTras409 === 'Impostor Salah', 'el formulario CONSERVA los datos tras el error')

    const trasConflicto = await leerFilas(page)
    comprobar(trasConflicto.length === 7, 'la tabla no se modifico por el 409')

    await capturar(page, '03-conflicto-409')

    // ---------- 4. Validacion (400) ----------
    console.log('\n=== 4. Tipo invalido (400) ===')
    await completarFormulario(page, { nombre: 'Mal Tipo', dorsal: '77', edad: 'veinte' })

    // El propio guion se verifica: si el campo no quedo con el valor exacto, la
    // prueba no estaria enviando lo que dice enviar.
    const edadTecleada = await page.$eval('input[placeholder="27"]', (el) => el.value)
    comprobar(edadTecleada === 'veinte', `el campo edad contiene exactamente "${edadTecleada}"`)

    await clicPorTexto(page, '.ficha button', 'Fichar')
    await esperar(600)

    const aviso400 = await leerAviso(page)
    comprobar(aviso400.codigo === '400', `el banner muestra el codigo ${aviso400.codigo}`)
    comprobar(aviso400.motivos.length >= 1, `lista ${aviso400.motivos.length} motivos del arreglo message`)

    await capturar(page, '04-validacion-400')

    // ---------- 5. Edicion inline (200) ----------
    console.log('\n=== 5. Edicion inline (200) ===')
    let fila = await filaDe(page, 'Rio Ngumoha')
    comprobar(fila !== null, 'se localiza la fila del jugador fichado')
    await clicPorTexto(fila, 'button', 'Editar')
    await page.waitForSelector('.fila--editando', { timeout: 5000 })

    fila = await page.$('.fila--editando')
    await vaciarYEscribir(await fila.$('input[aria-label="Goles"]'), '4')
    await clicPorTexto(fila, 'button', 'Guardar')
    await page.waitForSelector('.aviso--exito', { timeout: 10000 })

    const avisoPatch = await leerAviso(page)
    comprobar(avisoPatch.texto.includes('200'), `el aviso declara el codigo: "${avisoPatch.texto}"`)

    const trasPatch = await leerFilas(page)
    const editado = trasPatch.find((f) => f.nombre === 'Rio Ngumoha')
    comprobar(editado?.goles === '4', `los goles se actualizan a ${editado?.goles}`)
    comprobar(editado?.edad === '18', `los campos no enviados se conservan (edad ${editado?.edad})`)
    comprobar(trasPatch.length === 7, 'la cantidad de filas no cambia')

    await capturar(page, '05-tras-edicion')

    // ---------- 6. PATCH sin cambios (400) ----------
    console.log('\n=== 6. Guardar sin modificar nada (400) ===')
    fila = await filaDe(page, 'Rio Ngumoha')
    await clicPorTexto(fila, 'button', 'Editar')
    await page.waitForSelector('.fila--editando', { timeout: 5000 })
    fila = await page.$('.fila--editando')
    await clicPorTexto(fila, 'button', 'Guardar')
    await page.waitForSelector('.aviso--error', { timeout: 10000 })

    const avisoVacio = await leerAviso(page)
    comprobar(avisoVacio.codigo === '400', `cuerpo vacio rechazado con ${avisoVacio.codigo}`)
    comprobar(
      (await page.$('.fila--editando')) !== null,
      'la fila sigue en modo edicion: el error no la cierra',
    )

    fila = await page.$('.fila--editando')
    await clicPorTexto(fila, 'button', 'Cancelar')
    await esperar(200)

    // ---------- 7. Baja (204) ----------
    console.log('\n=== 7. Baja con confirmacion (204) ===')
    fila = await filaDe(page, 'Rio Ngumoha')
    await clicPorTexto(fila, 'button', 'Baja')
    await page.waitForSelector('.fila--confirmando', { timeout: 5000 })

    const textoConfirmacion = await page.$eval('.fila--confirmando', (el) => el.textContent)
    comprobar(
      textoConfirmacion.includes('no se puede deshacer'),
      'pide confirmacion antes de borrar',
    )
    comprobar(
      (await filaDe(page, 'Rio Ngumoha')) !== null,
      'la fila sigue presente mientras no se confirma',
    )

    await capturar(page, '06-confirmar-baja')

    fila = await page.$('.fila--confirmando')
    await clicPorTexto(fila, 'button', 'Confirmar baja')
    await page.waitForSelector('.aviso--exito', { timeout: 10000 })

    const avisoBaja = await leerAviso(page)
    comprobar(avisoBaja.texto.includes('204'), `el aviso declara el codigo: "${avisoBaja.texto}"`)

    const trasBaja = await leerFilas(page)
    comprobar(trasBaja.length === 6, `la tabla vuelve a ${trasBaja.length} filas`)
    comprobar(
      trasBaja.every((f) => f.nombre !== 'Rio Ngumoha'),
      'la fila desaparecio solo despues del 204',
    )

    await capturar(page, '07-tras-baja')

    // ---------- 8. Esqueleto de carga ----------
    console.log('\n=== 8. Estado de carga ===')
    await page.setRequestInterception(true)
    const demorar = async (peticion) => {
      if (peticion.url().includes('/jugadores')) {
        await esperar(900)
      }
      await peticion.continue()
    }
    page.on('request', demorar)

    const recarga = page.reload({ waitUntil: 'networkidle2' })
    await page.waitForSelector('.esqueleto', { timeout: 5000 })
    ok('se muestra el esqueleto de carga mientras la API responde')
    await capturar(page, '08-cargando')
    await recarga
    await page.waitForSelector('.tabla tbody tr', { timeout: 10000 })

    page.off('request', demorar)

    // ---------- 9. Error de red ----------
    console.log('\n=== 9. API caida ===')
    const abortar = async (peticion) => {
      if (peticion.url().includes('/jugadores')) await peticion.abort()
      else await peticion.continue()
    }
    page.on('request', abortar)

    await clicPorTexto(page, '.cabecera button', 'Recargar')
    await page.waitForSelector('.vacio .aviso--error', { timeout: 10000 })

    const avisoRed = await leerAviso(page)
    comprobar(
      avisoRed.texto.includes('No se pudo contactar'),
      `se informa la caida de la API: "${avisoRed.texto}"`,
    )
    comprobar(
      await clicPorTexto(page, '.vacio button', 'Reintentar'),
      'ofrece un boton para reintentar',
    )

    await capturar(page, '09-api-caida')

    page.off('request', abortar)
    await page.setRequestInterception(false)

    // ---------- 10. Ancho de telefono ----------
    console.log('\n=== 10. Ancho de telefono ===')
    await page.setViewport({ width: 390, height: 844 })
    await page.goto(UI, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.tabla tbody tr', { timeout: 10000 })

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    comprobar(desborde <= 0, `sin scroll horizontal en 390px (desborde ${desborde}px)`)
    await capturar(page, '10-telefono')

    // ---------- 11. Consola limpia ----------
    console.log('\n=== 11. Consola del navegador ===')
    const relevantes = erroresDeConsola.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('net::ERR_FAILED'),
    )
    comprobar(
      relevantes.length === 0,
      relevantes.length === 0
        ? 'sin errores de React ni excepciones en consola'
        : `hay ${relevantes.length} errores en consola`,
      relevantes.join('\n      '),
    )
  } finally {
    await browser.close()
  }

  console.log('\n=======================================')
  console.log(`RESULTADO: ${pass} correctas, ${fail} fallidas`)
  if (fallos.length > 0) console.log(`Fallos: ${fallos.join(' | ')}`)
  console.log(`Capturas en ${CAPTURAS}/`)

  await writeFile(
    `${CAPTURAS}/resultado.json`,
    JSON.stringify({ pass, fail, fallos, fecha: new Date().toISOString() }, null, 2),
  )

  process.exit(fail === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('\nLa verificacion se interrumpio:', error.message)
  process.exit(2)
})
