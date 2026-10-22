# Conclave + Go URL Shortener — backlog

Última actualización: 22 de octubre de 2026.

## Estado actual

### Hecho

- [x] Worker genérico separado en el repositorio privado
  `VKneider/cloudflare-worker-shortener`.
- [x] Custom Domain `go.vkneider.dev`.
- [x] KV de producción y preview.
- [x] API versionada: `POST /api/v1/links`, `GET /api/v1/links/:code`.
- [x] Redirección pública `GET /:code`.
- [x] Validación de destinos mediante `ALLOWED_ORIGINS`.
- [x] Validación del `Origin` de las aplicaciones mediante `APP_ORIGINS`.
- [x] CORS restringido.
- [x] Códigos aleatorios Base62 con comprobación de colisión.
- [x] Metadata Open Graph/Twitter (`preview`) para WhatsApp y otros crawlers.
- [x] Compatibilidad con enlaces antiguos sin metadata.
- [x] TTL por enlace mediante `expiresIn`.
- [x] Máximo de 30 días para enlaces creados desde Conclave, aplicado en dos
  capas:
  - `SHORT_LINK_TTL_SECONDS = 2592000` en Conclave.
  - `MAX_TTL_BY_ORIGIN` en Go.
- [x] Interruptor de emergencia `CREATE_ENABLED=false`: detiene nuevas
  creaciones sin romper la resolución de enlaces existentes.
- [x] Fallback de Conclave a enlaces largos si Go no está disponible.
- [x] Documentación de integración y operaciones.
- [x] Tests unitarios del Worker.
- [x] Conclave desplegado mediante Vercel.

## Prioridad P0 — monitoring y alertas

### P0.1 Rate Limiting en Cloudflare

Configurar una regla para:

```text
Host: go.vkneider.dev
Method: POST
Path: /api/v1/links
```

Propuesta inicial: 30 solicitudes por minuto por IP y bloqueo temporal.

**Criterio de aceptación:** una ráfaga abusiva recibe `429` o bloqueo de
Cloudflare sin afectar `GET /:code`.

### P0.2 Health check externo

Configurar un monitor externo para:

```text
GET https://go.vkneider.dev/api/health
```

Validar:

```json
{ "ok": true, "creationEnabled": true }
```

Herramientas posibles: Better Uptime, UptimeRobot, Cloudflare Health Checks o
un workflow programado de GitHub Actions.

**Criterio de aceptación:** alerta por downtime y recuperación, con un periodo
de gracia para evitar falsos positivos durante deployments.

### P0.3 Logs y errores del Worker

Operación manual inmediata:

```powershell
node_modules\.bin\wrangler.cmd tail
```

Investigar la opción de Workers Logpush/Observability para conservar y consultar:

- Respuestas `4xx` y `5xx`.
- Latencia.
- Errores de KV.
- Picos de `POST /api/v1/links`.
- Orígenes rechazados.

**Criterio de aceptación:** poder distinguir un fallo de Go, KV, CORS,
allowlist o cliente en menos de cinco minutos.

### P0.4 Alertas de almacenamiento y expiración

Definir una política sobre enlaces permanentes y TTL. Conclave ya usa 30 días;
otras aplicaciones pueden usar `expiresIn` o enlaces permanentes.

**Criterio de aceptación:** documentar qué aplicaciones usan TTL y revisar el
crecimiento de KV antes de alcanzar límites de cuenta.

## Prioridad P1 — CI/CD

### P1.1 GitHub Actions para Go — completado

Implementado en `go-url-shortener/.github/workflows/worker.yml`:

- [x] Validación en Pull Requests.
- [x] Deploy de `testing` con KV preview.
- [x] Deploy de `main` con KV producción.
- [x] Secrets documentados: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

Pendiente solo configurar los secrets en GitHub y crear el branch remoto
`testing`.

**Criterio de aceptación:** un PR defectuoso no despliega; un merge aprobado
despliega una versión identificable y deja el commit asociado.

### P1.2 CI de Conclave

Crear un workflow que ejecute:

```text
pnpm install --frozen-lockfile
pnpm run lint
pnpm run slice:types
pnpm run slice:doctor
pnpm run build
```

Añadir Playwright con instalación explícita de Chromium cuando el runner lo
permita. Los tests E2E de compartir deben comprobar:

- Se solicita metadata `preview`.
- Se conserva el fallback largo si Go falla.
- Se respeta el límite de 30 días.

### P1.3 Protección de ramas

Configurar en GitHub:

- Pull request obligatorio para `main`/`master`.
- CI obligatorio antes de merge.
- Prohibir force push.
- Mantener el repositorio del Worker privado.

## Prioridad P1 — seguridad y abuso

### P1.4 Turnstile o backend de creación

`Origin` y CORS no son autenticación criptográfica. Si Rate Limiting no es
suficiente, elegir una opción:

1. Cloudflare Turnstile en el flujo de creación.
2. Endpoint backend por aplicación con un secreto nunca enviado al navegador.
3. Cuotas por aplicación/IP en Cloudflare.

No introducir un token secreto en una SPA: cualquier secreto del bundle es
recuperable por el usuario.

### P1.5 Revisión de dominios permitidos

Cada nueva aplicación debe añadirse explícitamente a:

- `APP_ORIGINS`.
- `ALLOWED_ORIGINS`.
- `ALLOWED_IMAGE_ORIGINS`, si utiliza imágenes OG en otro dominio.

## Prioridad P2 — administración

### P2.1 Borrado administrativo

Actualmente los enlaces se eliminan por TTL o manualmente desde Wrangler. Si se
necesita administración, diseñar un endpoint protegido separado para:

- Revocar un código.
- Consultar metadata.
- Listar por aplicación.

No exponer un endpoint de borrado sin autenticación.

### P2.2 Analytics

Si se necesitan estadísticas, no sobrecargar KV con contadores concurrentes.
Evaluar D1, Analytics Engine o eventos asíncronos. Mantener KV para la lectura
rápida del destino.

## Prioridad P2 — resiliencia

### P2.3 Backups y recuperación

Documentar qué hacer ante:

- Borrado accidental del namespace.
- Cambio de cuenta Cloudflare.
- Pérdida del Custom Domain.
- Rollback de Worker.

El repositorio contiene el código, pero KV contiene los enlaces; ambos deben
formar parte del plan de recuperación.

### P2.4 Entornos

Separar explícitamente:

- Producción: `go.vkneider.dev` + KV producción.
- Preview/local: Worker local o deployment preview + KV preview.

Evitar que pruebas escriban en el namespace de producción.

## Runbook rápido

### Apagar nuevas creaciones

```toml
CREATE_ENABLED = "false"
```

```powershell
pnpm run deploy
```

### Reactivar

```toml
CREATE_ENABLED = "true"
```

```powershell
pnpm run deploy
```

### Rollback

```powershell
node_modules\.bin\wrangler.cmd deployments list
node_modules\.bin\wrangler.cmd rollback <VERSION_ID>
```

### Desactivar Go solamente en Conclave

```js
export const URL_SHORTENER_ENDPOINT = '';
export const URL_SHORTENER_PUBLIC_ORIGIN = '';
```

Después desplegar Conclave. Los enlaces largos seguirán funcionando; los cortos
requieren que Go continúe activo.
