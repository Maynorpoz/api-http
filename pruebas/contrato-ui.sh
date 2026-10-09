#!/usr/bin/env bash
# Reproduce la secuencia que ejecuta la interfaz, con el Origin del navegador,
# para verificar que el contrato funciona tal como la UI lo consume.
BASE=${BASE:-http://localhost:3000}
API=$BASE/jugadores
ORIGEN=${ORIGEN:-http://localhost:5173}
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); printf 'PASS  %s\n' "$1"; }
mal()  { FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; }

# navegador <metodo> <ruta> [cuerpo] -> imprime "codigo|cuerpo"
navegador() {
  local metodo="$1" ruta="$2" cuerpo="${3:-}"
  local args=(-s -w $'\n%{http_code}' -X "$metodo" -H "Origin: $ORIGEN")
  [ -n "$cuerpo" ] && args+=(-H 'Content-Type: application/json' -d "$cuerpo")
  local salida; salida=$(curl "${args[@]}" "$ruta")
  printf '%s|%s' "$(printf '%s' "$salida" | tail -n1)" "$(printf '%s' "$salida" | sed '$d')"
}

campo() { printf '%s' "$2" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s)$1)}catch{console.log('')}})"; }

echo "===== 1. La UI monta y pide la coleccion ====="
R=$(navegador GET "$API"); COD=${R%%|*}; CUERPO=${R#*|}
[ "$COD" = "200" ] && ok "GET /jugadores -> 200 (estado 'listo')" || mal "GET inicial devolvio $COD"
INICIAL=$(campo '.length' "$CUERPO")
echo "      la tabla renderiza $INICIAL filas"

echo
echo "===== 2. Formulario de fichaje ====="
R=$(navegador POST "$API" '{"nombre":"Rio Ngumoha","dorsal":73,"posicion":"DELANTERO","edad":18}')
COD=${R%%|*}; CUERPO=${R#*|}
[ "$COD" = "201" ] && ok "POST -> 201, la UI inserta la fila con el objeto devuelto" || mal "POST devolvio $COD"
NUEVO=$(campo '.id' "$CUERPO")
GOLES=$(campo '.goles' "$CUERPO")
DORSAL=$(campo '.dorsal' "$CUERPO")
[ ${#NUEVO} -eq 36 ] && ok "la respuesta trae un uuid generado por el servidor" || mal "la respuesta no trae id"
[ "$GOLES" = "0" ] && ok "goles omitido llega como 0 desde la API, no inventado por la UI" || mal "goles fue '$GOLES'"
[ "$DORSAL" = "73" ] && ok "dorsal confirmado por la API: $DORSAL" || mal "dorsal fue '$DORSAL'"

echo
echo "===== 3. El formulario no se limpia ante un error ====="
R=$(navegador POST "$API" '{"nombre":"Repetido","dorsal":73,"posicion":"DEFENSA","edad":25}')
COD=${R%%|*}; CUERPO=${R#*|}
[ "$COD" = "409" ] && ok "POST con dorsal ocupado -> 409, la UI muestra el banner y conserva los datos" || mal "esperaba 409, obtuvo $COD"
MOTIVO=$(campo '.message[0]' "$CUERPO")
echo "      banner: \"$MOTIVO\""

R=$(navegador POST "$API" '{"nombre":"Mal Tipo","dorsal":74,"posicion":"DEFENSA","edad":"veinte"}')
COD=${R%%|*}; CUERPO=${R#*|}
[ "$COD" = "400" ] && ok "POST con edad no numerica -> 400 (el input de texto permite provocarlo)" || mal "esperaba 400, obtuvo $COD"
CANT=$(campo '.message.length' "$CUERPO")
[ "$CANT" -ge 1 ] && ok "la UI lista $CANT motivos del arreglo message" || mal "message vino vacio"

echo
echo "===== 4. Edicion inline: PATCH con solo lo modificado ====="
R=$(navegador PATCH "$API/$NUEVO" '{"goles":1}')
COD=${R%%|*}; CUERPO=${R#*|}
[ "$COD" = "200" ] && ok "PATCH {goles:1} -> 200, la fila se reemplaza con la respuesta" || mal "PATCH devolvio $COD"
NUEVOS_GOLES=$(campo '.goles' "$CUERPO")
NOMBRE_INTACTO=$(campo '.nombre' "$CUERPO")
[ "$NUEVOS_GOLES" = "1" ] && ok "goles actualizado a 1" || mal "goles quedo en '$NUEVOS_GOLES'"
[ "$NOMBRE_INTACTO" = "Rio Ngumoha" ] && ok "los campos no enviados se conservan (semantica de PATCH)" || mal "el nombre cambio a '$NOMBRE_INTACTO'"

R=$(navegador PATCH "$API/$NUEVO" '{}')
COD=${R%%|*}
[ "$COD" = "400" ] && ok "guardar sin tocar nada -> 400 por cuerpo vacio" || mal "esperaba 400, obtuvo $COD"

R=$(navegador PATCH "$API/$NUEVO" '{"dorsal":11}')
COD=${R%%|*}
[ "$COD" = "409" ] && ok "editar hacia un dorsal ocupado -> 409, la fila no se modifica" || mal "esperaba 409, obtuvo $COD"

echo
echo "===== 5. Baja: la fila se quita despues del 204 ====="
LARGO=$(curl -s -o /dev/null -w '%{http_code} %{size_download}' -X DELETE -H "Origin: $ORIGEN" "$API/$NUEVO")
[ "$LARGO" = "204 0" ] && ok "DELETE -> 204 sin cuerpo; recien ahi la UI descarta la fila" || mal "DELETE devolvio '$LARGO'"
R=$(navegador GET "$API/$NUEVO"); COD=${R%%|*}
[ "$COD" = "404" ] && ok "el recurso ya no existe -> 404" || mal "esperaba 404, obtuvo $COD"

R=$(navegador GET "$API"); COD=${R%%|*}; CUERPO=${R#*|}
FINAL=$(campo '.length' "$CUERPO")
[ "$FINAL" = "$INICIAL" ] && ok "el plantel volvio a su tamanio inicial ($FINAL)" || mal "quedo en $FINAL y empezo en $INICIAL"

echo
echo "===== 6. Preflight de las operaciones de escritura ====="
for metodo in POST PATCH PUT DELETE; do
  H=$(curl -s -o /dev/null -D - -X OPTIONS -H "Origin: $ORIGEN" \
    -H "Access-Control-Request-Method: $metodo" \
    -H 'Access-Control-Request-Headers: content-type' "$API" | tr -d '\r')
  echo "$H" | grep -qi "access-control-allow-origin: $ORIGEN" \
    && echo "$H" | grep -qi "access-control-allow-methods:.*$metodo" \
    && ok "preflight de $metodo autorizado" || mal "preflight de $metodo rechazado"
done

echo
echo "====================================="
echo "RESULTADO: $PASS correctas, $FAIL fallidas"
[ "$FAIL" -eq 0 ] || exit 1
