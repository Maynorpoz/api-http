#!/usr/bin/env bash
# Recorre la matriz de demostracion del README y verifica el codigo HTTP de cada caso.
BASE=${BASE:-http://localhost:3000}
API=$BASE/jugadores
ORIGEN=http://localhost:5173
PASS=0; FAIL=0

# verificar <esperado> <descripcion> <curl args...>
verificar() {
  local esperado="$1"; local desc="$2"; shift 2
  local salida codigo cuerpo
  salida=$(curl -s -w $'\n%{http_code}' "$@")
  codigo=$(printf '%s' "$salida" | tail -n1)
  cuerpo=$(printf '%s' "$salida" | sed '$d')
  if [ "$codigo" = "$esperado" ]; then
    PASS=$((PASS+1)); printf 'PASS  %-3s  %s\n' "$codigo" "$desc"
  else
    FAIL=$((FAIL+1)); printf 'FAIL  esperaba %s, obtuvo %s  %s\n      %s\n' "$esperado" "$codigo" "$desc" "$cuerpo"
  fi
  ULTIMO_CUERPO="$cuerpo"
}

ok_extra()  { PASS=$((PASS+1)); printf 'PASS  ---  %s\n' "$1"; }
mal_extra() { FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; }

# Cantidad de elementos del ultimo cuerpo JSON recibido.
cuenta() {
  printf '%s' "$ULTIMO_CUERPO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).length)}catch{console.log(-1)}})'
}

# comprobar_cuenta <esperado> <descripcion>
comprobar_cuenta() {
  local obtenido
  obtenido=$(cuenta)
  if [ "$obtenido" = "$1" ]; then ok_extra "$2"; else mal_extra "$2 (obtuvo $obtenido, esperaba $1)"; fi
}

J='Content-Type: application/json'

echo "=============== LECTURA ==============="
verificar 200 "GET coleccion" "$API"
SEMILLA=$(printf '%s' "$ULTIMO_CUERPO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log(a.length+" "+a.map(j=>j.dorsal).join(","))})')
echo "      plantel inicial: $SEMILLA jugadores/dorsales"
ID=$(printf '%s' "$ULTIMO_CUERPO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].id))')
verificar 200 "GET detalle de un id existente" "$API/$ID"

# La busqueda se prueba aqui, antes de que las altas modifiquen el plantel: los
# conteos esperados corresponden a la semilla de 6 jugadores.
echo
echo "=============== BUSQUEDA =============="
verificar 200 "?nombre=sal filtra por coincidencia parcial" "$API?nombre=sal"
comprobar_cuenta 1 "devuelve solo a Salah"
verificar 200 "?nombre=SAL no distingue mayusculas" "$API?nombre=SAL"
comprobar_cuenta 1 "misma coincidencia escrito en mayusculas"
verificar 200 "?posicion=DEFENSA filtra por enum" "$API?posicion=DEFENSA"
comprobar_cuenta 2 "devuelve los 2 defensas de la semilla"
verificar 200 "filtros combinados nombre + posicion" "$API?nombre=van&posicion=DEFENSA"
comprobar_cuenta 1 "los dos filtros se aplican juntos"
verificar 200 "sin coincidencias responde 200, no 404" "$API?nombre=zzzzz"
comprobar_cuenta 0 "coleccion vacia: el recurso existe igual"
verificar 200 "?nombre= vacio equivale a no filtrar" "$API?nombre="
comprobar_cuenta 6 "devuelve el plantel completo"
verificar 400 "posicion fuera del enum" "$API?posicion=LATERAL"
echo "      -> $ULTIMO_CUERPO"
verificar 400 "parametro de query desconocido" "$API?sueldo=5000"
echo "      -> $ULTIMO_CUERPO"

echo
echo "=============== CREACION =============="
verificar 201 "POST fichaje valido (dorsal 18 libre)" -X POST -H "$J" \
  -d '{"nombre":"Cody Gakpo","dorsal":18,"posicion":"DELANTERO","edad":27,"goles":30}' "$API"
NUEVO=$(printf '%s' "$ULTIMO_CUERPO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.id)})')
verificar 201 "POST sin goles (debe asumir 0)" -X POST -H "$J" \
  -d '{"nombre":"Conor Bradley","dorsal":84,"posicion":"DEFENSA","edad":22}' "$API"
GOLES=$(printf '%s' "$ULTIMO_CUERPO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).goles))')
if [ "$GOLES" = "0" ]; then PASS=$((PASS+1)); echo "PASS  ---  goles por defecto = 0"; else FAIL=$((FAIL+1)); echo "FAIL  goles por defecto fue '$GOLES', esperaba 0"; fi

echo
echo "=============== VALIDACION (400) ======"
verificar 400 "tipo incorrecto: edad string" -X POST -H "$J" \
  -d '{"nombre":"Prueba Tipo","dorsal":60,"posicion":"DEFENSA","edad":"veinte"}' "$API"
echo "      -> $ULTIMO_CUERPO"
verificar 400 "rango: dorsal 150" -X POST -H "$J" \
  -d '{"nombre":"Prueba Rango","dorsal":150,"posicion":"DEFENSA","edad":25}' "$API"
verificar 400 "rango: edad 12" -X POST -H "$J" \
  -d '{"nombre":"Prueba Edad","dorsal":61,"posicion":"DEFENSA","edad":12}' "$API"
verificar 400 "enum invalido: posicion" -X POST -H "$J" \
  -d '{"nombre":"Prueba Enum","dorsal":62,"posicion":"ARQUERO SUPLENTE","edad":25}' "$API"
verificar 400 "propiedad desconocida: sueldo" -X POST -H "$J" \
  -d '{"nombre":"Prueba Extra","dorsal":63,"posicion":"DEFENSA","edad":25,"sueldo":5000}' "$API"
echo "      -> $ULTIMO_CUERPO"
verificar 400 "faltan campos obligatorios" -X POST -H "$J" -d '{"nombre":"Solo Nombre"}' "$API"
verificar 400 "nombre demasiado corto" -X POST -H "$J" \
  -d '{"nombre":"ab","dorsal":64,"posicion":"DEFENSA","edad":25}' "$API"
verificar 400 "intento de fijar el id desde el cliente" -X POST -H "$J" \
  -d '{"id":"11111111-1111-1111-1111-111111111111","nombre":"Intruso Id","dorsal":65,"posicion":"DEFENSA","edad":25}' "$API"
verificar 400 "PATCH con cuerpo vacio" -X PATCH -H "$J" -d '{}' "$API/$NUEVO"
echo "      -> $ULTIMO_CUERPO"
verificar 400 "id con formato no UUID" "$API/no-es-un-uuid"
echo "      -> $ULTIMO_CUERPO"

echo
echo "=============== CONFLICTO (409) ======="
verificar 409 "POST con dorsal ocupado (11 = Salah)" -X POST -H "$J" \
  -d '{"nombre":"Impostor Salah","dorsal":11,"posicion":"DELANTERO","edad":30}' "$API"
echo "      -> $ULTIMO_CUERPO"
verificar 409 "PATCH moviendo a un dorsal ocupado" -X PATCH -H "$J" -d '{"dorsal":11}' "$API/$NUEVO"
verificar 409 "PUT moviendo a un dorsal ocupado" -X PUT -H "$J" \
  -d '{"nombre":"Cody Gakpo","dorsal":11,"posicion":"DELANTERO","edad":27,"goles":30}' "$API/$NUEVO"

echo
echo "=============== MODIFICACION =========="
verificar 200 "PATCH parcial: sumar un gol" -X PATCH -H "$J" -d '{"goles":31}' "$API/$NUEVO"
echo "      -> $ULTIMO_CUERPO"
verificar 200 "PATCH conservando su propio dorsal" -X PATCH -H "$J" -d '{"dorsal":18}' "$API/$NUEVO"
verificar 200 "PUT reemplazo completo" -X PUT -H "$J" \
  -d '{"nombre":"Cody Gakpo","dorsal":18,"posicion":"MEDIOCAMPISTA","edad":28,"goles":35}' "$API/$NUEVO"
echo "      -> $ULTIMO_CUERPO"
verificar 400 "PUT omitiendo goles (reemplazo exige todo)" -X PUT -H "$J" \
  -d '{"nombre":"Cody Gakpo","dorsal":18,"posicion":"DELANTERO","edad":27}' "$API/$NUEVO"

echo
echo "=============== NO ENCONTRADO (404) ==="
FANTASMA=99999999-9999-4999-8999-999999999999
verificar 404 "GET de un uuid inexistente" "$API/$FANTASMA"
echo "      -> $ULTIMO_CUERPO"
verificar 404 "PATCH de un uuid inexistente" -X PATCH -H "$J" -d '{"goles":1}' "$API/$FANTASMA"
verificar 404 "DELETE de un uuid inexistente" -X DELETE "$API/$FANTASMA"

echo
echo "=============== BAJA (204) ============"
CODIGO_Y_LARGO=$(curl -s -o /tmp/cuerpo204 -w '%{http_code} %{size_download}' -X DELETE "$API/$NUEVO")
if [ "$CODIGO_Y_LARGO" = "204 0" ]; then
  PASS=$((PASS+1)); echo "PASS  204  DELETE responde 204 y sin cuerpo"
else
  FAIL=$((FAIL+1)); echo "FAIL  DELETE devolvio '$CODIGO_Y_LARGO' (esperaba '204 0')"
fi
verificar 404 "el jugador dado de baja ya no existe" "$API/$NUEVO"

echo
echo "=============== CORS =================="
PREFLIGHT=$(curl -s -o /dev/null -D - -X OPTIONS -H "Origin: $ORIGEN" \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' "$API" | tr -d '\r')
echo "$PREFLIGHT" | grep -qi "access-control-allow-origin: $ORIGEN" \
  && { PASS=$((PASS+1)); echo "PASS  ---  preflight autoriza $ORIGEN"; } \
  || { FAIL=$((FAIL+1)); echo "FAIL  el preflight no autoriza el origen del frontend"; }
echo "$PREFLIGHT" | grep -qi 'access-control-allow-origin: \*' \
  && { FAIL=$((FAIL+1)); echo "FAIL  CORS esta abierto con '*'"; } \
  || { PASS=$((PASS+1)); echo "PASS  ---  CORS no usa comodin '*'"; }
# Con un origen fijo, el middleware de CORS devuelve siempre ese valor y nunca
# refleja el del solicitante: el navegador compara y bloquea. Lo que hay que
# verificar es justamente que no se refleje el origen ajeno.
AJENO=http://localhost:9999
ECO=$(curl -s -o /dev/null -D - -H "Origin: $AJENO" "$API" | tr -d '\r' \
  | grep -i '^access-control-allow-origin:' | sed 's/^[^:]*: *//')
if [ "$ECO" = "$ORIGEN" ]; then
  PASS=$((PASS+1)); echo "PASS  ---  a un origen ajeno se le responde '$ECO', no el suyo: el navegador lo bloquea"
elif [ "$ECO" = "$AJENO" ]; then
  FAIL=$((FAIL+1)); echo "FAIL  la API refleja el origen ajeno '$AJENO'"
else
  FAIL=$((FAIL+1)); echo "FAIL  Access-Control-Allow-Origin inesperado: '$ECO'"
fi

echo
echo "=============== OPENAPI ==============="
verificar 200 "GET /api/docs (Swagger UI)" $BASE/api/docs
SPEC=$(curl -s $BASE/api/docs-json)
printf '%s' "$SPEC" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const d=JSON.parse(s);
  const esperados=[["/jugadores",["get","post"]],["/jugadores/{id}",["get","patch","put","delete"]]];
  let ok=true;
  for(const [ruta,metodos] of esperados){
    for(const m of metodos){
      if(!d.paths?.[ruta]?.[m]){console.log("FALTA "+m.toUpperCase()+" "+ruta);ok=false;}
    }
  }
  const schemas=Object.keys(d.components?.schemas??{});
  for(const s2 of ["Jugador","CreateJugadorDto","UpdateJugadorDto","ReplaceJugadorDto","ApiError"]){
    if(!schemas.includes(s2)){console.log("FALTA schema "+s2);ok=false;}
  }
  const codigos=new Set();
  for(const ruta of Object.values(d.paths)) for(const op of Object.values(ruta)) Object.keys(op.responses??{}).forEach(c=>codigos.add(c));
  const documentados=[...codigos].sort().join(",");
  for(const c of ["200","201","204","400","404","409"]){
    if(!codigos.has(c)){console.log("FALTA codigo documentado "+c);ok=false;}
  }
  console.log(ok?"OPENAPI_OK codigos="+documentados:"OPENAPI_INCOMPLETO codigos="+documentados);
})' > /tmp/openapi.txt 2>&1
cat /tmp/openapi.txt
grep -q OPENAPI_OK /tmp/openapi.txt && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo
echo "=============== LIMITE DE PLANTEL ====="
# El plantel tiene 7 jugadores: se completan hasta 25 y el 26 debe dar 409.
for d in $(seq 30 47); do
  curl -s -o /dev/null -X POST -H "$J" \
    -d "{\"nombre\":\"Suplente $d\",\"dorsal\":$d,\"posicion\":\"DEFENSA\",\"edad\":20}" "$API"
done
TOTAL=$(curl -s "$API" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')
echo "      plantel ahora: $TOTAL jugadores"
verificar 409 "fichar por encima del limite de 25" -X POST -H "$J" \
  -d '{"nombre":"Fuera De Cupo","dorsal":99,"posicion":"DELANTERO","edad":24}' "$API"
echo "      -> $ULTIMO_CUERPO"

echo
echo "======================================="
echo "RESULTADO: $PASS correctas, $FAIL fallidas"
[ "$FAIL" -eq 0 ] || exit 1
