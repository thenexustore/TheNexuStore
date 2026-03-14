# Home Composer — Checklist de verificación con Playwright (Admin)

Este checklist evita falsos errores tipo `ERR_EMPTY_RESPONSE` cuando queremos validar UI o tomar screenshots del Home Composer.

## 1) Arrancar Admin correctamente

```bash
npm --prefix Frontend/admin run dev -- --hostname 0.0.0.0 --port 3000
```

Debes ver algo como:
- `Local: http://localhost:3000`
- `Network: http://0.0.0.0:3000`
- `Ready`

## 2) Confirmar que responde antes de Playwright

```bash
curl -I http://127.0.0.1:3000/home-composer
```

Esperado: `HTTP/1.1 200 OK` (o redirección válida que termine en 200).

Si falla con conexión vacía o refused:
- El server no está levantado.
- O está en otro puerto.
- O aún está compilando la primera carga (espera unos segundos y repite).

## 3) Ejecutar screenshot Playwright

Ejemplo de script (con browser tools):
- URL objetivo: `http://127.0.0.1:3000/home-composer`
- `wait_until: 'networkidle'`
- `timeout` recomendado: 20000ms

## 4) Cerrar servidor al terminar

Si lo levantaste en una sesión dedicada, enviar `Ctrl+C` para evitar procesos colgados.

---

## Nota de diagnóstico

Cuando aparezca `net::ERR_EMPTY_RESPONSE` en Playwright para `127.0.0.1:3000`, la causa más probable es entorno (servidor no escuchando) y **no** un bug funcional del Home Composer.

Este checklist es obligatorio para validaciones visuales locales del módulo.


## 5) Opción automatizada (recomendada)

Puedes ejecutar todo el flujo con un solo comando:

```bash
# opción directa
bash ops/home_composer_screenshot.sh

# o desde scripts de admin
npm --prefix Frontend/admin run screenshot:home-composer
```

Variables útiles:
- `PORT` (default `3000`)
- `TARGET_PATH` (default `/home-composer`)
- `ARTIFACT_PATH` (default `artifacts/home-composer-automated.png`)
- `TIMEOUT_SECONDS` (default `45`)


### Nota sobre dependencias Playwright
El script automatizado intenta, por orden:
1. `python playwright` (si el módulo está disponible),
2. `npx playwright` (si está disponible en entorno Node),
3. fallback a snapshot HTML (si no hay Playwright instalado), para que al menos la verificación de disponibilidad no falle.
