# Go — acortador de enlaces

Conclave usa **Go**, un acortador genérico desplegado como Cloudflare Worker.
El Worker es independiente de Conclave y puede ser reutilizado por otras
aplicaciones.

Repositorio privado del Worker:

```text
../go-url-shortener/
https://github.com/VKneider/cloudflare-worker-shortener
```

## Qué problema resuelve

Conclave ya tenía enlaces autocontenidos. La información de una Plantilla,
Respuestas o Consenso se comprime y viaja en el `hash`:

```text
https://conclave.vkneider.dev/#plantilla=datos-comprimidos
```

Go guarda esa URL como destino y crea un código corto:

```text
https://go.vkneider.dev/Ab3xYz9
```

Cuando alguien abre el enlace, Go responde con un `302` hacia la URL original.
El importador actual de Conclave sigue procesando el `hash`; no se duplicó la
lógica de compresión ni de validación de Plantillas en el Worker.

## Arquitectura

```text
Conclave
  POST https://go.vkneider.dev/api/v1/links
    { "destination": "https://conclave.vkneider.dev/#respuestas=..." }
  ← { "code": "Ab3xYz9", "url": "https://go.vkneider.dev/Ab3xYz9" }

Persona que abre el enlace corto
  GET https://go.vkneider.dev/Ab3xYz9
  ← 302 Location: https://conclave.vkneider.dev/#respuestas=...
```

El Worker no sabe qué es una Plantilla, Respuesta o Consenso. Su modelo es
genérico:

```text
Cloudflare KV
  Ab3xYz9 → {
    destination: "https://app-permitida/...",
    createdAt: "2026-10-21T..."
  }
```

La compresión de Conclave no es cifrado. Quien tenga un enlace compartido puede
acceder a la información que el enlace original contiene.

## Repositorios y responsabilidades

### `go-url-shortener` — privado

Contiene exclusivamente:

- `src/index.js`: Worker genérico.
- `src/index.test.js`: pruebas unitarias del Worker.
- `wrangler.toml`: Custom Domain, variables y binding de KV.
- Scripts de Wrangler y configuración de despliegue.

### `conclave`

Contiene únicamente el cliente:

- `src/Components/Core/UrlShortenerService/UrlShortenerService.js`.
- Configuración de endpoint en `src/AppConfig.js`.
- Integración en Plantilla, Respuestas, Consenso, modales y CompareView.

## API pública

### Health check

```http
GET /api/health
```

Respuesta (incluye `preview` cuando se guardó metadata):

```json
{ "ok": true, "service": "go-url-shortener" }
```

### Crear un enlace

```http
POST /api/v1/links
Content-Type: application/json
```

Body:

```json
{
  "destination": "https://conclave.vkneider.dev/#plantilla=...",
  "preview": {
    "title": "Plantilla: Retiro 2026",
    "description": "Ana compartió una plantilla de Conclave",
    "image": "https://conclave.vkneider.dev/images/og-image.png"
  }
}
```

Respuesta `201`:

```json
{
  "code": "Ab3xYz9",
  "url": "https://go.vkneider.dev/Ab3xYz9"
}
```

El código tiene 7 caracteres aleatorios Base62. Antes de guardar se comprueba
que no exista una colisión.

### Resolver un enlace

```http
GET /api/v1/links/Ab3xYz9
```

Respuesta:

```json
{
  "code": "Ab3xYz9",
  "destination": "https://conclave.vkneider.dev/#plantilla=...",
  "createdAt": "2026-10-21T00:00:00.000Z"
}
```

### Redireccionar

```http
GET /Ab3xYz9
```

Si el registro no tiene metadata de preview, responde `302` con `Location`
apuntando al destino guardado. Se usa `302` en lugar de `301` para no hacer
permanente el resultado en cachés mientras el servicio todavía puede
evolucionar.

Si el registro tiene `preview`, responde `200 text/html` con `og:title`,
`og:description`, `og:image` y metadata de Twitter. La página incluye `meta
refresh` y `location.replace()` para que un navegador llegue inmediatamente al
destino. Los crawlers pueden leer el preview sin ejecutar JavaScript.

### Metadata Open Graph

Conclave envía automáticamente metadata distinta según el tipo de enlace:

```text
Plantilla: Nombre
Respuestas — Nombre de la Plantilla
Resumen final — Nombre de la Plantilla
```

La imagen actual es `/images/og-image.png`. El Worker limita y escapa los
campos antes de construir HTML; no acepta HTML arbitrario. La imagen debe ser
HTTPS y pertenecer a un origen permitido.

El Worker conserva además alias de desarrollo para `/api/shorten` y
`/api/resolve/:code`, pero los clientes nuevos deben usar `/api/v1/links`.

## Validaciones y seguridad

El Worker no es un redireccionador abierto:

- Solo acepta destinos de `ALLOWED_ORIGINS`.
- Solo acepta `http` y `https`.
- Rechaza URLs con usuario o contraseña.
- Limita el destino a 8192 caracteres.
- Limita `preview.title` a 120 caracteres y `preview.description` a 300.
- Solo acepta imágenes HTTPS de `ALLOWED_IMAGE_ORIGINS` (o de los orígenes de
  la aplicación si no se define esa variable).
- Usa códigos aleatorios, no IDs incrementales.
- Comprueba colisiones antes de escribir en KV.
- Permite definir `SHORT_URL_TTL_SECONDS` para expiración opcional.
- CORS solo permite los orígenes declarados en `APP_ORIGINS`.
- La creación exige un header `Origin` perteneciente a `APP_ORIGINS`.
- No existen secretos dentro del código cliente de Conclave.

CORS y `Origin` no son autenticación criptográfica: una persona puede falsificar
headers usando un cliente HTTP. Como las aplicaciones son SPAs, no se puede
esconder un secreto en el navegador. Por eso la configuración de producción
debe añadir una regla de **Cloudflare Rate Limiting** sobre
`POST /api/v1/links`. Si se necesita protección contra bots más fuerte, se
puede añadir Turnstile o mover la creación a un backend.

El Worker y el repositorio son privados, pero el endpoint de redirección y la
API de creación deben ser públicamente accesibles: cualquier persona que reciba
un enlace necesita poder abrirlo y la SPA no puede esconder un secreto en su
JavaScript.

## Configuración Cloudflare

`go-url-shortener/wrangler.toml` contiene:

```toml
name = "go-url-shortener"
main = "src/index.js"
workers_dev = true

[[routes]]
pattern = "go.vkneider.dev"
custom_domain = true

[vars]
APP_ORIGINS = "https://conclave.vkneider.dev"
ALLOWED_ORIGINS = "https://conclave.vkneider.dev"
SHORTENER_ORIGIN = "https://go.vkneider.dev"

[[kv_namespaces]]
binding = "SHORT_URLS"
id = "..."
preview_id = "..."
```

`go.vkneider.dev` es un **Custom Domain** dedicado al Worker. Cloudflare crea
el DNS y el certificado TLS; no se usa una ruta global sobre el dominio de
Conclave ni se interfiere con Vercel.

Para añadir otra aplicación:

```toml
APP_ORIGINS = "https://conclave.vkneider.dev,https://otra-app.vkneider.dev"
ALLOWED_ORIGINS = "https://conclave.vkneider.dev,https://otra-app.vkneider.dev"
```

Después hay que desplegar de nuevo el Worker.

## Primer despliegue

Desde la carpeta hermana:

```powershell
cd C:\Users\victo\Desktop\SPIKE-PWA-SLICE\go-url-shortener
pnpm install
```

Si pnpm solicita aprobar scripts, aprobar `esbuild` y `workerd`, que Wrangler
necesita para el runtime local.

Autenticación:

```powershell
node_modules\.bin\wrangler.cmd login
node_modules\.bin\wrangler.cmd whoami
```

Crear KV solo si se configura una cuenta nueva:

```powershell
pnpm run kv:create
pnpm run kv:create:preview
```

Copiar los IDs generados en `wrangler.toml` y desplegar:

```powershell
pnpm run deploy
```

Comprobar:

```powershell
Invoke-RestMethod https://go.vkneider.dev/api/health
```

## Desarrollo local

1. En el `wrangler.toml` local, permitir el origen de desarrollo:

   ```toml
   [vars]
   APP_ORIGINS = "http://localhost:3001"
   ALLOWED_ORIGINS = "http://localhost:3001,https://conclave.vkneider.dev"
   SHORTENER_ORIGIN = "http://localhost:8787"
   ```

2. Iniciar Go:

   ```powershell
   cd ..\go-url-shortener
   pnpm run dev
   ```

3. Cambiar temporalmente en Conclave:

   ```js
   export const URL_SHORTENER_ENDPOINT = 'http://localhost:8787';
   export const URL_SHORTENER_PUBLIC_ORIGIN = 'http://localhost:8787';
   ```

4. Iniciar Conclave en su puerto habitual.

No dejar esas variables locales en un despliegue de producción.

## Integración en Conclave

La configuración actual es:

```js
// src/AppConfig.js
export const URL_SHORTENER_ENDPOINT = 'https://go.vkneider.dev';
export const URL_SHORTENER_PUBLIC_ORIGIN = 'https://go.vkneider.dev';
```

`UrlShortenerService`:

1. Envía el enlace completo a `POST /api/v1/links`.
2. Verifica que la respuesta pertenezca al origen público esperado.
3. Devuelve el enlace corto.
4. Resuelve enlaces pegados en CompareView mediante `GET /api/v1/links/:code`.

Se integra en:

- Compartir Plantilla.
- Compartir Respuestas.
- Compartir Consenso.
- Copiar al portapapeles.
- Compartir nativo del dispositivo.
- Enviar por correo.
- Generar códigos QR.
- Importar enlaces desde CompareView.

### Fallback

Si `URL_SHORTENER_ENDPOINT` está vacío, se usa el enlace largo actual.

Si Go responde con error o no está disponible:

- Un enlace que no supera `SHARE_URL_MAX_LENGTH` vuelve al formato largo.
- Un enlace demasiado grande muestra la alternativa de exportar el archivo.

Esto permite desplegar Conclave antes o después del Worker sin romper el
comportamiento anterior.

## Pruebas

Desde `go-url-shortener`:

```powershell
node --test
```

Las pruebas cubren:

- Creación de enlace.
- Resolución vía API.
- Redirección `302`.
- Rechazo de destinos fuera de la allowlist.

El endpoint de producción comprobado es:

```text
https://go.vkneider.dev/api/health
```
