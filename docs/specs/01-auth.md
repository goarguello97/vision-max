# Spec 01: Autenticación y cuenta

> **Estado:** FINAL. Las 10 asunciones fueron validadas por el usuario (ver sección 13).
> Las referencias `(A1)` a `(A10)` en el texto remiten a esas decisiones, numeradas igual que en `docs/specs/00-decisiones.md`. Ese archivo es la fuente de verdad transversal: si esta spec lo contradice, gana `00-decisiones.md`.
> **Proyecto:** Vision Max (clon de TMDB) · **Módulo:** Autenticación y cuenta · **Idioma de UI:** español

---

## 0. Historia de usuario

> Como **visitante** quiero **registrarme** (campos: ID, Email, Name, Last Name, más contraseña), **iniciar sesión**, **mantener la sesión persistida con tokens**, **cerrar sesión**, **recuperar mi contraseña por mail** e **iniciar sesión con Google**, para poder usar las funciones personales de la app.

### 0.1 Alcance

| Incluido | Fuera de alcance (otros módulos o fases) |
|---|---|
| Registro con email y contraseña | Edición de perfil, subida de avatar y perfil público `/u/:username` (módulo 03); cambio de email |
| Login con email y contraseña | Borrado de cuenta |
| Login y registro con Google | Otros proveedores (Apple, GitHub, Facebook) |
| Sesión persistida (access + refresh token) | 2FA / passkeys |
| Logout | Panel de "sesiones activas" con revocación por dispositivo |
| Recupero de contraseña por email + reseteo | Verificación obligatoria de email `(A5)` |
| Paso "Completá tu perfil" para altas vía Google `(A4)` | Funciones personales en sí (favoritos, perfiles, búsqueda de usuarios): solo consumen la sesión |
| Rutas protegidas y redirección post-login | Panel de administración |
| Exponer `avatarUrl` en el usuario de sesión (columnas en `users`) | Uso de Supabase Auth: el auth es propio |

### 0.3 Ubicación en el monorepo

El repo es un monorepo TypeScript con npm workspaces. Este módulo ocupa:

| Workspace | Qué contiene de este módulo |
|---|---|
| `packages/shared` | Esquemas zod de register, login, forgot, reset, Google complete y username, más los tipos `PublicUser`, `AuthResponse` y `ApiError`, y la lista de IDs reservados. Front y back los importan de acá: una sola fuente de validación |
| `apps/server` | Rutas `/api/auth/*`, middleware `requireAuth`, modelos y migraciones de Sequelize (`users`, `refresh_tokens`, `password_reset_tokens`), servicio de mail, rate limiting y job de limpieza |
| `apps/client` | Slice `auth`, endpoints RTK Query de auth, `baseQuery` con reauth, páginas `/ingresar`, `/registro`, `/recuperar-contrasena`, `/restablecer-contrasena` y `/completar-perfil`, guard de rutas protegidas y menú de usuario del header |

### 0.2 Glosario

- **ID (username):** identificador público único elegido por el usuario, tipo handle (`@gonza_97`). No es la PK interna. `(A4)`
- **Access token:** JWT de vida corta que autoriza las requests a la API. `(A1)`
- **Refresh token:** token opaco de vida larga, rotativo, que permite obtener nuevos access tokens sin volver a loguearse. `(A1)`
- **Familia de refresh tokens:** cadena de refresh tokens que nacen de un mismo login. Si se detecta reuso de un token ya rotado, se revoca la familia entera.
- **Cuenta solo-Google:** usuario sin `password_hash`, creado vía Google.

---

## 1. Reglas de negocio

### Registro
- **RN-01** Campos obligatorios: ID, Email, Nombre, Apellido, Contraseña y Confirmar contraseña. Todos se validan en cliente y se revalidan en servidor (el servidor es la fuente de verdad).
- **RN-02** El **ID** es único sin distinguir mayúsculas y minúsculas, se guarda en minúsculas, tiene entre 3 y 20 caracteres de `[a-z0-9_]`, debe empezar con letra y no puede ser una palabra reservada (`admin`, `root`, `api`, `tmdb`, `soporte`, `ingresar`, `registro`, `me`, `u`, `perfil`, `visionmax`, `vision_max`, `null`, `undefined`, etc.). La lista vive en `packages/shared`. El ID se usa como URL del perfil público: `/u/:username`. `(A4)`
- **RN-03** La disponibilidad del ID se chequea en vivo (debounce de 400 ms) mientras el usuario escribe. Al enviar el form se revalida igual.
- **RN-04** El **email** se normaliza (`trim` + minúsculas), tiene un máximo de 254 caracteres, formato RFC 5322 simplificado y es único (columna `CITEXT`).
- **RN-05** **Nombre** y **Apellido**: 1 a 50 caracteres cada uno, después de `trim`. Se aceptan letras Unicode (tildes, ñ), espacios, apóstrofes y guiones. No se aceptan dígitos ni emojis.
- **RN-06** **Política de contraseña:** mínimo 8 y máximo 72 caracteres (límite de bcrypt), con al menos una letra y al menos un número. No puede ser igual al email ni al ID. `(A9)`
- **RN-07** Las contraseñas se hashean con **bcrypt, costo 12**. Nunca se loguean ni se devuelven.
- **RN-08** Si el email ya existe, el registro devuelve error de campo "Ya existe una cuenta con este email" junto con un link a "Iniciar sesión". Se acepta esta enumeración mínima en el registro por UX; el login y el recupero no enumeran.
- **RN-09** Si el email ya existe como **cuenta solo-Google**, el error de registro sugiere "Continuar con Google".
- **RN-10** Un registro exitoso deja al usuario **logueado de inmediato** (emite tokens). No se exige verificar el email. `(A5)`
- **RN-11** Se aceptan los términos implícitamente con un texto legal bajo el botón ("Al crear tu cuenta aceptás los Términos y la Política de privacidad"). No hay checkbox.

### Login
- **RN-12** El login se hace con **email + contraseña**. El ID no sirve como credencial. `(A4)`
- **RN-13** Las credenciales inválidas siempre devuelven el mismo error genérico: "Email o contraseña incorrectos". Esto aplica a un email inexistente, a una contraseña errónea y a una cuenta solo-Google sin contraseña. El servidor compara contra un hash dummy cuando el usuario no existe, para igualar los tiempos de respuesta.
- **RN-14** **Rate limit:** 5 intentos fallidos por combinación email+IP en una ventana de 15 minutos. Al superarlo responde `429` con "Demasiados intentos. Probá de nuevo en X minutos." No se bloquea la cuenta. `(A10)`
- **RN-15** El login exitoso actualiza `last_login_at` y redirige a la ruta `?next=` si es interna y válida. Si no, va a `/`.

### Sesión persistida
- **RN-16** El access token es un **JWT HS256** con TTL de **15 minutos** y payload `{ sub: userId, username }`. `(A1)`
- **RN-17** El refresh token es un **string aleatorio de 256 bits** (opaco). En la DB se guarda solo su hash SHA-256. Tiene TTL **deslizante de 30 días**: cada rotación emite uno nuevo con 30 días desde ese momento. No hay checkbox "Recordarme": la sesión siempre persiste. `(A1)`
- **RN-18** **Rotación obligatoria:** cada `POST /auth/refresh` invalida el refresh usado y emite uno nuevo de la misma familia.
- **RN-19** **Detección de reuso:** si llega un refresh ya rotado, fuera de una ventana de gracia de 10 segundos, se revoca toda la familia y la respuesta es `401 SESSION_REVOKED`. La ventana de gracia existe para tolerar la carrera entre pestañas.
- **RN-20** **Almacenamiento en el cliente:** el access token vive **solo en memoria** (store de Redux). El refresh token va en **cookie `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/auth`**. Al recargar la página, la app llama a `/auth/refresh` para rehidratar la sesión. `(A2)`
- **RN-21** Las requests a `/auth/refresh` y `/auth/logout` exigen el header `X-Requested-With: tmdb-web` como mitigación CSRF adicional a `SameSite`.
- **RN-22** Un usuario puede tener múltiples sesiones (familias) simultáneas, una por dispositivo o navegador, sin límite.

### Logout
- **RN-23** "Cerrar sesión" revoca **solo la familia de la sesión actual**, borra la cookie, limpia el estado de Redux y avisa a las demás pestañas del mismo navegador vía `BroadcastChannel('auth')`, que también se desloguean.
- **RN-24** El logout siempre "funciona" desde el punto de vista del usuario: si la red falla, igual se limpia el estado local y se reintenta la revocación en segundo plano una vez.
- **RN-25** Después del logout, el usuario va a `/`. Si estaba en una ruta protegida, va a `/ingresar`.

### Recupero de contraseña
- **RN-26** "Olvidé mi contraseña" pide solo el email. La respuesta es **siempre la misma**, exista o no la cuenta: "Si existe una cuenta con ese email, te enviamos un link para restablecer tu contraseña."
- **RN-27** El token de reseteo es aleatorio de 256 bits. En DB se guarda hasheado (SHA-256) con **expiración de 60 minutos** y es de **un solo uso**. Pedir uno nuevo invalida los anteriores pendientes del mismo usuario. `(A8)`
- **RN-28** Rate limit del pedido: 3 solicitudes por email por hora y 10 por IP por hora. Al superarlo se mantiene la misma respuesta genérica, pero no se envía el mail.
- **RN-29** El link tiene la forma `${APP_URL}/restablecer-contrasena?token=<token>`. El email se envía en HTML + texto plano, en español, con el branding de la app. `(A7)`
- **RN-30** Una cuenta solo-Google **sí puede** usar el recupero: el link le permite *crear* una contraseña y, a partir de ahí, puede loguearse con ambos métodos.
- **RN-31** Al restablecer la contraseña se marca el token como usado, se actualiza `password_changed_at` y se **revocan todas las familias de refresh** del usuario (cierra sesión en todos los dispositivos). El usuario va a `/ingresar` con el aviso "Contraseña actualizada. Ya podés iniciar sesión." No hay auto-login.
- **RN-32** La nueva contraseña cumple RN-06 y no puede ser igual a la actual (se compara contra el hash).

### Google
- **RN-33** Se usa **Google Identity Services** (botón oficial "Continuar con Google" / One Tap deshabilitado). El frontend obtiene un **ID token** (credential) y lo envía al backend, que lo verifica con `google-auth-library` (audience = `GOOGLE_CLIENT_ID`, issuer de Google, `email_verified = true`). `(A6)`
- **RN-34** Casos de resolución, en orden:
  1. Existe un usuario con ese `google_sub`: login.
  2. No existe `google_sub`, pero sí un usuario con ese email: **se vincula automáticamente** (se setea `google_sub`) y se loguea, solo si Google marca `email_verified = true`. `(A3)`
  3. No existe ni `google_sub` ni el email: es un **alta nueva**. Se pide completar el **ID** en `/completar-perfil` (Nombre y Apellido vienen prellenados de `given_name`/`family_name` y son editables). Mientras no lo complete, no hay usuario en la DB. El estado intermedio vive en un `onboardingToken` (JWT firmado, 15 minutos, con `sub`, email, nombre y apellido). `(A4)`
- **RN-35** Las cuentas creadas vía Google se consideran con email verificado (`email_verified_at = now()`). No se importa la foto de Google como avatar: `avatar_key` queda `NULL` y la UI muestra las iniciales hasta que el usuario suba un avatar desde el módulo 03.
- **RN-36** Si el usuario cierra o cancela el popup de Google, no se muestra error, solo se rehabilita el botón.

### Rutas protegidas
- **RN-37** Las rutas que exigen login redirigen a `/ingresar?next=<ruta>` si no hay sesión: los perfiles `/u/:username`, la búsqueda de usuarios `/usuarios` y "Mi perfil" `/perfil` (módulo 03). El catálogo (Home, búsqueda de títulos, detalle) es público y nunca redirige. Las rutas de auth (`/ingresar`, `/registro`, etc.) redirigen a `/` si ya hay sesión.
- **RN-38** `next` solo acepta paths relativos internos que empiecen con `/` y no con `//`, para prevenir open redirect.

---

## 2. Modelo de datos (Supabase Postgres + Sequelize)

- **Motor:** Postgres de Supabase. Sequelize se conecta con `DATABASE_URL`, apuntando al **pooler** de Supabase. **No** se usa Supabase Auth: las tablas de usuarios y tokens son propias, del schema `public`, y no tocan `auth.users`.
- **Migraciones:** con `sequelize-cli` desde `apps/server`, sin `sync()`. La primera migración habilita las extensiones `citext` y `pgcrypto` (`gen_random_uuid()`) con `CREATE EXTENSION IF NOT EXISTS`.
- **Convenciones:** todas las tablas usan `underscored: true` y timestamps.
- **Acceso:** solo desde el backend. Estas tablas no se exponen por la API REST/PostgREST de Supabase. Se habilita RLS sin políticas, para que la `anon key` no pueda leerlas.

### 2.1 `users`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | PK interna, nunca visible en la UI |
| `username` | `CITEXT` | `NOT NULL`, `UNIQUE` | El "ID" de la historia `(A4)` |
| `email` | `CITEXT` | `NOT NULL`, `UNIQUE` | Normalizado |
| `first_name` | `VARCHAR(50)` | `NOT NULL` | "Name" |
| `last_name` | `VARCHAR(50)` | `NOT NULL` | "Last Name" |
| `password_hash` | `VARCHAR(60)` | `NULL` | `NULL` si es una cuenta solo-Google |
| `google_sub` | `VARCHAR(255)` | `NULL`, `UNIQUE` | ID estable de Google |
| `email_verified_at` | `TIMESTAMPTZ` | `NULL` | Se setea para cuentas Google; con email queda `NULL` `(A5)` |
| `password_changed_at` | `TIMESTAMPTZ` | `NULL` | |
| `last_login_at` | `TIMESTAMPTZ` | `NULL` | |
| `avatar_key` | `VARCHAR(255)` | `NULL` | Ruta del objeto en el bucket `avatars` de Supabase Storage. La escribe el módulo 03; en el alta queda `NULL` |
| `avatar_updated_at` | `TIMESTAMPTZ` | `NULL` | Se usa como cache-buster de `avatarUrl`. La escribe el módulo 03 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | |

Check: `password_hash IS NOT NULL OR google_sub IS NOT NULL`.
El `defaultScope` del modelo excluye `password_hash`. Hay un scope `withPassword` para el login.

**`avatarUrl` (derivado, no se persiste):** si `avatar_key` es `NULL`, vale `null` (la UI muestra las iniciales). Si no, es la URL pública `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_AVATARS_BUCKET}/${avatar_key}?v=<epoch de avatar_updated_at>`. La construye un único helper del backend que comparten auth y el módulo 03. Este módulo crea las dos columnas en la migración de `users`, pero no sube ni borra archivos.

### 2.2 `refresh_tokens`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK a `users.id`, `ON DELETE CASCADE`, index | |
| `family_id` | `UUID` | `NOT NULL`, index | Una por login |
| `token_hash` | `CHAR(64)` | `NOT NULL`, `UNIQUE` | SHA-256 hex |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `rotated_at` | `TIMESTAMPTZ` | `NULL` | Cuándo se usó para rotar (ventana de gracia) |
| `replaced_by_id` | `UUID` | `NULL`, FK a self | |
| `revoked_at` | `TIMESTAMPTZ` | `NULL` | |
| `user_agent` | `VARCHAR(255)` | `NULL` | Diagnóstico |
| `ip` | `INET` | `NULL` | Diagnóstico |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | |

Limpieza: un job diario borra los registros con `expires_at < now() - 7 days`.

### 2.3 `password_reset_tokens`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK a `users.id`, `ON DELETE CASCADE`, index | |
| `token_hash` | `CHAR(64)` | `NOT NULL`, `UNIQUE` | |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | `created_at + 60 min` `(A8)` |
| `used_at` | `TIMESTAMPTZ` | `NULL` | |
| `invalidated_at` | `TIMESTAMPTZ` | `NULL` | Se setea al pedir otro |
| `requested_ip` | `INET` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | |

### 2.4 Rate limiting
Almacenamiento: limitador propio de ventana fija sobre la misma base Supabase Postgres (tabla `rate_limits`, creada por migración), para no sumar Redis en el MVP. No se usa `rate-limiter-flexible` porque prepara statements con nombre fijo, incompatibles con el pooler de Supabase en modo transacción. `(A10)`

---

## 3. API (`apps/server`, Express), prefijo `/api/auth`

**Formato de error común:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Revisá los campos marcados.", "fields": { "email": "Ingresá un email válido." } } }
```
**Objeto `user` de sesión** (tipo `PublicUser` en `packages/shared`): `{ id, username, email, firstName, lastName, avatarUrl, hasPassword, hasGoogle, createdAt }`. `avatarUrl` es `string | null` (ver sección 2.1). Todas las respuestas que devuelven `user` usan esta forma: E1, E3, E4, E6, E10 y E11.

| # | Método y ruta | Auth | Body / query | Éxito | Errores |
|---|---|---|---|---|---|
| E1 | `POST /register` | – | `{ username, email, firstName, lastName, password }` | `201 { user, accessToken }` + `Set-Cookie: rt` | `400 VALIDATION_ERROR`, `409 USERNAME_TAKEN`, `409 EMAIL_TAKEN` (`fields.email`, `meta.googleOnly`) |
| E2 | `GET /username-available?u=` | – | query `u` | `200 { available, reason? }` (`reason`: `taken`, `reserved` o `invalid`) | `429` |
| E3 | `POST /login` | – | `{ email, password }` | `200 { user, accessToken }` + cookie | `400`, `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS` (`meta.retryAfterSec`) |
| E4 | `POST /refresh` | cookie `rt` + header CSRF | – | `200 { user, accessToken }` + cookie rotada | `401 NO_SESSION`, `401 SESSION_EXPIRED`, `401 SESSION_REVOKED` (borra la cookie) |
| E5 | `POST /logout` | cookie `rt` + header CSRF | – | `204` + borra la cookie | Idempotente: siempre `204` |
| E6 | `GET /me` | Bearer | – | `200 { user }`: incluye `username` y `avatarUrl` (`null` sin avatar). Lo usan el header y el módulo 03 para refrescar el avatar después de subirlo | `401 TOKEN_EXPIRED`, `401 TOKEN_INVALID` |
| E7 | `POST /forgot-password` | – | `{ email }` | `202 { message }` (siempre igual) | `400` (solo si el formato es inválido) |
| E8 | `GET /reset-password/validate?token=` | – | query `token` | `200 { valid: true, email: "g***@gmail.com" }` | `410 RESET_TOKEN_INVALID` (expirado, usado, invalidado o inexistente: un solo código) |
| E9 | `POST /reset-password` | – | `{ token, password }` | `200 { message }` | `400 VALIDATION_ERROR`, `400 SAME_PASSWORD`, `410 RESET_TOKEN_INVALID` |
| E10 | `POST /google` | – | `{ credential }` | `200 { status: "authenticated", user, accessToken }` + cookie **o** `200 { status: "needs_profile", onboardingToken, prefill: { email, firstName, lastName, suggestedUsername } }` | `401 GOOGLE_TOKEN_INVALID`, `403 GOOGLE_EMAIL_UNVERIFIED` |
| E11 | `POST /google/complete` | – | `{ onboardingToken, username, firstName, lastName }` | `201 { user, accessToken }` + cookie | `400`, `401 ONBOARDING_EXPIRED`, `409 USERNAME_TAKEN`, `409 ACCOUNT_EXISTS` (carrera: alguien creó la cuenta entretanto) |

**Cookie `rt`:** `HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000`, con `Domain` según `COOKIE_DOMAIN`. En desarrollo `Secure` depende de `COOKIE_SECURE=false` y el frontend usa el proxy de Vite (`/api` apunta a `localhost:3000`), así front y API comparten origen. `(A2)`

**Middleware `requireAuth`:** lee `Authorization: Bearer`, verifica el JWT y además rechaza el token si su `iat` es anterior a `password_changed_at`. Pone `req.user` con `{ id, username }`.

### 3.1 Flujo de tokens

```
 Navegador (React/Redux)                    API Express                     Postgres
 ───────────────────────                    ───────────                     ────────
 [carga app] ──POST /auth/refresh (cookie rt)──▶ busca hash(rt) ───────────▶ refresh_tokens
             ◀── 200 {user, accessToken} + Set-Cookie rt' ── rota (rt usado→rotated, rt' nuevo)
 accessToken en memoria (Redux)

 [request]   ──GET /api/... Bearer AT──────────▶ requireAuth OK
             ◀── 401 TOKEN_EXPIRED ──────────── (AT vencido)
 interceptor: 1 solo refresh en vuelo (single-flight + navigator.locks entre pestañas)
             ──POST /auth/refresh──────────────▶ rota
             ◀── 200 nuevo AT ───────────────── reintenta la request original 1 vez

 [reuso rt viejo > 10 s] ─POST /auth/refresh──▶ detecta rotated_at + gracia vencida
             ◀── 401 SESSION_REVOKED ─────────── revoca toda la family_id
 → logout local + toast "Tu sesión se cerró por seguridad. Iniciá sesión de nuevo."
```

---

## 4. Frontend (`apps/client`: React + Redux Toolkit + Vite, TypeScript)

### 4.1 Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/registro` | Registro | Solo sin sesión |
| `/ingresar` | Login | Solo sin sesión |
| `/recuperar-contrasena` | Pedir link | Solo sin sesión |
| `/restablecer-contrasena?token=` | Nueva contraseña | Cualquiera; si hay sesión, se cierra primero |
| `/completar-perfil` | Elegir ID tras Google | Solo con `onboardingToken` en memoria; si no hay, redirige a `/registro` |

### 4.2 Estado `auth` (slice de RTK)

```
auth: {
  status: 'idle' | 'bootstrapping' | 'authenticated' | 'anonymous',
  user: PublicUser | null,           // tipo de packages/shared; incluye username y avatarUrl
  accessToken: string | null,        // solo memoria, nunca persistido (A2)
  onboarding: { token, prefill } | null,
  flash: { type, message } | null    // ej. "Contraseña actualizada…"
}
```
- Las llamadas a la API van con **RTK Query** y un `baseQuery` con reauth: ante `401 TOKEN_EXPIRED` hace refresh single-flight y reintenta una vez. Ante cualquier otro 401 de refresh, hace logout local.
- **Bootstrap:** mientras `status = 'bootstrapping'` (primer refresh al cargar), el header muestra un skeleton en el slot de usuario y las rutas protegidas muestran un loader. Nunca hay "flash" de pantalla de login.
- **Sincronización entre pestañas:** `BroadcastChannel('auth')` con los mensajes `logout` y `login`. Una pestaña que recibe `login` hace su propio refresh.
- **Avatar en el header:** si `user.avatarUrl` existe, se muestra la imagen (32 px desktop, 28 px mobile) con `alt` = nombre completo. Si es `null` o la imagen falla al cargar, se muestran las iniciales (Nombre + Apellido). Cuando el módulo 03 actualiza el avatar, invalida el tag `Me` de RTK Query y el header se refresca vía E6.
- **Menú de usuario:** muestra nombre, `@username`, "Mi perfil" (link a `/u/:username`), "Mis favoritos" y "Cerrar sesión".

### 4.3 UI y dirección visual
- Tema oscuro por defecto. Tailwind v4 (tokens en `@theme`), Motion para transiciones, skill `design-taste-frontend` (VARIANCE 6 / MOTION 5 / DENSITY 5).
- **Layout desktop (≥1024 px):** split asimétrico 7/5. A la izquierda, un collage de backdrops de películas en tendencia (vía el proxy TMDB con caché del módulo 02 Catálogo) con gradiente oscuro, logo y tagline. A la derecha, la card del formulario. Ver mockups.
- **Tablet (768 a 1023 px):** fondo con backdrop difuminado y la card centrada de 480 px.
- **Mobile (<768 px):** una columna, banda superior de 160 px con posters, el formulario a ancho completo con gutter de 16 px, CTA principal sticky al fondo cuando hay teclado, inputs de 48 px de alto mínimo y `font-size ≥ 16px` (evita el zoom en iOS).
- **Motion:** la card entra con fade + translateY de 12 px (200 ms), los errores de campo aparecen con height auto + fade, el botón en loading muestra un spinner inline sin cambiar de ancho, y se respeta `prefers-reduced-motion`.
- **Accesibilidad:** labels visibles, `aria-invalid` + `aria-describedby` en errores, foco al primer campo con error al enviar, toggle "mostrar contraseña" con `aria-pressed`, contraste AA, `autocomplete` correcto (`username`, `email`, `given-name`, `family-name`, `new-password`, `current-password`).
- **Copy:** español rioplatense (voseo: "Ingresá", "Creá tu cuenta"), consistente con el resto de la app.

### 4.4 Validación por campo (cliente y servidor)

| Campo | Regla | Mensaje |
|---|---|---|
| ID | requerido | "Elegí un ID." |
| ID | formato RN-02 | "Usá de 3 a 20 caracteres: letras, números o _ (empezando con letra)." |
| ID | ocupado | "Ese ID ya está en uso." |
| ID | reservado | "Ese ID no está disponible." |
| Email | requerido / formato | "Ingresá tu email." / "Ingresá un email válido." |
| Email | existente | "Ya existe una cuenta con este email. ¿Querés iniciar sesión?" |
| Email | existente solo-Google | "Esta cuenta se creó con Google. Continuá con Google." |
| Nombre / Apellido | requerido / formato | "Ingresá tu nombre." / "Usá solo letras, espacios, ' o -." |
| Contraseña | política | "Mínimo 8 caracteres, con al menos una letra y un número." |
| Contraseña | igual a email/ID | "La contraseña no puede ser igual a tu email o ID." |
| Confirmar | no coincide | "Las contraseñas no coinciden." |

La validación corre al hacer `blur` y al enviar. Una vez que un campo mostró error, se revalida en cada `change`. El medidor de fuerza de la contraseña es solo informativo: un checklist que se tilda en vivo.

---

## 5. Casos borde

1. **Doble submit** de registro o login: el botón queda deshabilitado mientras hay una request en vuelo. Además, el backend es idempotente por unicidad de email/ID (el segundo request da `409`).
2. **Carrera de ID:** el chequeo en vivo dijo "disponible" pero otro lo tomó antes: el servidor devuelve `409 USERNAME_TAKEN` y el campo muestra el error.
3. **Mayúsculas en email o ID:** `Gonza@Gmail.com` y `gonza@gmail.com` son la misma cuenta (CITEXT).
4. **Email con espacios** al inicio o al final: se recortan en cliente y servidor.
5. **Contraseña con más de 72 bytes** (por ejemplo, con emojis multibyte): se rechaza por longitud en bytes, no en caracteres.
6. **Varias pestañas** abiertas al vencer el access token: `navigator.locks` serializa el refresh y la ventana de gracia de 10 s evita la revocación falsa.
7. **Cookie de refresh borrada a mano** o expirada: el bootstrap da `401 NO_SESSION` y el usuario pasa a anónimo sin mostrar error.
8. **Refresh robado y reusado:** se revoca la familia y ambos (atacante y víctima) quedan deslogueados. La víctima ve un toast de seguridad.
9. **Contraseña cambiada en otro dispositivo:** los access tokens emitidos antes se rechazan (`iat < password_changed_at`) y los refresh están revocados (RN-31).
10. **Link de reset expirado, usado o pedido dos veces:** la pantalla de "link inválido" ofrece "Pedir un link nuevo". Solo el último link es válido.
11. **Link de reset abierto con sesión iniciada:** se hace logout local y se muestra el formulario de reset.
12. **Cuenta solo-Google intenta el login con contraseña:** recibe el error genérico (RN-13). El texto de ayuda bajo el form dice "¿Te registraste con Google? Usá el botón de Google."
13. **Cuenta solo-Google usa el recupero:** crea su contraseña (RN-30).
14. **Google con email no verificado** (cuentas de Workspace raras): `403`, con el mensaje "No pudimos verificar tu email de Google. Registrate con email y contraseña."
15. **Onboarding de Google abandonado:** si el usuario cierra la pestaña en `/completar-perfil`, no queda nada en la DB. Al volver con Google, reinicia el paso.
16. **Onboarding expirado** (más de 15 minutos): "Tu sesión de Google expiró. Volvé a intentarlo." y vuelve a `/registro`.
17. **El email de Google ya fue registrado entre el paso 1 y el paso 2 del onboarding:** `409 ACCOUNT_EXISTS` y se reintenta el flujo de Google, que ahora vincula.
18. **`next` malicioso** (`//evil.com`, `https://…`): se ignora y redirige a `/`.
19. **Falla del proveedor de mail:** se loguea el error y la respuesta al usuario sigue siendo la genérica `202`, sin reintento automático en el MVP. `(A7)`
20. **Rate limit de login alcanzado:** el botón se deshabilita y muestra la cuenta regresiva ("Probá de nuevo en 12:34").
21. **Sin conexión:** las acciones muestran "No pudimos conectarnos. Revisá tu conexión." y el form conserva lo escrito, salvo las contraseñas.
22. **Autocompletado del navegador:** los formularios funcionan con valores autocompletados sin eventos de `change` (se valida al enviar).

---

## 6. Consideraciones técnicas

- **Lenguaje:** TypeScript en los tres workspaces (`apps/server`, `apps/client`, `packages/shared`).
- **Librerías de `apps/server`:** `express`, `sequelize` + `pg`, `bcrypt`, `jsonwebtoken`, `google-auth-library`, `nodemailer` `(A7)`, `helmet`, `cors` (origin = `APP_URL`, `credentials: true`) y `cookie-parser`. Valida los bodies con los esquemas zod de `packages/shared`.
- **Librerías de `apps/client`:** `@reduxjs/toolkit` (RTK Query), `react-router`, `react-hook-form` + `@hookform/resolvers/zod` (los mismos esquemas de `packages/shared`), Google Identity Services cargado como script (`accounts.google.com/gsi/client`) y `motion`.
- **`packages/shared`:** solo esquemas, tipos y constantes, sin dependencias de Node ni del DOM, para que lo consuman los dos lados.
- **Supabase:** se usa solo como Postgres administrado, y Storage desde el módulo 03. Este módulo no usa `@supabase/supabase-js` ni Supabase Auth. Solo lee `SUPABASE_URL` y `SUPABASE_AVATARS_BUCKET` para armar `avatarUrl`.
- **Migraciones** con `sequelize-cli` desde `apps/server` (nada de `sync({ alter })`). Seeders con un usuario de prueba solo para desarrollo.
- **Emails:** templates HTML en español, inline CSS, versión de texto plano. En desarrollo: Ethereal o Mailpit vía SMTP, y el link se imprime además en consola. `(A7)`
- **Logs:** nunca loguear contraseñas, tokens, cookies ni el body de `/auth/*`. Hay que loguear los eventos de seguridad: login fallido, reuso de refresh, reset solicitado y reset completado.
- **Testing:** tests de integración en `apps/server` (supertest + Postgres de test, local o un proyecto Supabase de staging) para E1 a E11, unit tests de los esquemas en `packages/shared` y tests de componentes de los formularios en `apps/client`. Los escenarios Gherkin de la sección 7 son la fuente de los casos.
- **HTTPS obligatorio** en producción (la cookie es `Secure`). `helmet` con una CSP que permita `accounts.google.com`, `image.tmdb.org` y el dominio de `SUPABASE_URL` en `img-src`.

### 6.1 Variables de entorno

| Variable | Dónde | Ejemplo / default |
|---|---|---|
| `DATABASE_URL` | back | Cadena del **pooler** de Supabase Postgres (`postgresql://…pooler.supabase.com:…/postgres`) |
| `SUPABASE_URL` | back | `https://<proyecto>.supabase.co` (para armar `avatarUrl`) |
| `SUPABASE_AVATARS_BUCKET` | back | `avatars` |
| `APP_URL` | back | `http://localhost:5173` (links de mail y CORS) |
| `JWT_ACCESS_SECRET` | back | 64+ bytes aleatorios |
| `JWT_ACCESS_TTL` | back | `15m` `(A1)` |
| `REFRESH_TOKEN_TTL_DAYS` | back | `30` `(A1)` |
| `ONBOARDING_JWT_SECRET` | back | secreto distinto |
| `COOKIE_DOMAIN` / `COOKIE_SECURE` | back | vacío / `true` |
| `BCRYPT_COST` | back | `12` |
| `RESET_TOKEN_TTL_MIN` | back | `60` `(A8)` |
| `GOOGLE_CLIENT_ID` | back | `xxx.apps.googleusercontent.com` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | back | `(A7)` |
| `VITE_GOOGLE_CLIENT_ID` | front | igual a `GOOGLE_CLIENT_ID` |
| `VITE_API_URL` | front | `/api` (con el proxy de Vite) |

Se incluye un `.env.example` en `apps/server` y otro en `apps/client`. Los `.env` reales van en `.gitignore`. `SUPABASE_SERVICE_ROLE_KEY` también vive en el `.env` de `apps/server`, pero la usa el módulo 03; auth no la necesita. Nunca se expone al cliente (sin prefijo `VITE_`).

---

## 7. Criterios de aceptación (Gherkin)

```gherkin
# language: es
Característica: Registro con email y contraseña

  Antecedentes:
    Dado que soy un visitante sin sesión
    Y estoy en "/registro"

  Escenario: Registro exitoso
    Cuando completo ID "gonza_97", email "gonza@mail.com", nombre "Gonzalo", apellido "Argüello"
    Y completo contraseña y confirmación con "peliculas2026"
    Y presiono "Crear cuenta"
    Entonces se crea mi cuenta con el ID "gonza_97" en minúsculas
    Y quedo con sesión iniciada sin verificar mi email
    Y soy redirigido a "/"
    Y el header muestra mi avatar con las iniciales "GA"

  Escenario: ID no disponible detectado en vivo
    Dado que existe un usuario con ID "cinefilo"
    Cuando escribo "Cinefilo" en el campo ID y pasan 400 ms
    Entonces veo junto al campo "Ese ID ya está en uso."
    Y el botón "Crear cuenta" sigue habilitado pero el envío vuelve a validar

  Esquema del escenario: ID con formato inválido
    Cuando escribo "<id>" en el campo ID y salgo del campo
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | id         | mensaje                                                                  |
      | ab         | Usá de 3 a 20 caracteres: letras, números o _ (empezando con letra).     |
      | 9lives     | Usá de 3 a 20 caracteres: letras, números o _ (empezando con letra).     |
      | gon.za     | Usá de 3 a 20 caracteres: letras, números o _ (empezando con letra).     |
      | admin      | Ese ID no está disponible.                                               |

  Esquema del escenario: Contraseña que no cumple la política
    Cuando ingreso la contraseña "<pass>" y salgo del campo
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | pass        | mensaje                                                      |
      | abc12       | Mínimo 8 caracteres, con al menos una letra y un número.     |
      | soloLetras  | Mínimo 8 caracteres, con al menos una letra y un número.     |
      | 12345678    | Mínimo 8 caracteres, con al menos una letra y un número.     |

  Escenario: Confirmación de contraseña distinta
    Cuando ingreso contraseña "peliculas2026" y confirmación "peliculas2025"
    Y presiono "Crear cuenta"
    Entonces veo "Las contraseñas no coinciden." bajo el campo de confirmación
    Y el foco se mueve a ese campo

  Escenario: Email ya registrado
    Dado que existe una cuenta con email "gonza@mail.com"
    Cuando intento registrarme con " GONZA@mail.com "
    Entonces veo "Ya existe una cuenta con este email. ¿Querés iniciar sesión?"
    Y el texto "iniciar sesión" es un link a "/ingresar"

  Escenario: Email ya registrado vía Google
    Dado que existe una cuenta solo-Google con email "gonza@gmail.com"
    Cuando intento registrarme con ese email
    Entonces veo "Esta cuenta se creó con Google. Continuá con Google."

  Escenario: Doble click en "Crear cuenta"
    Cuando presiono "Crear cuenta" dos veces seguidas con datos válidos
    Entonces se envía una única solicitud
    Y se crea una sola cuenta
```

```gherkin
# language: es
Característica: Inicio de sesión con email y contraseña

  Antecedentes:
    Dado que existe el usuario "gonza@mail.com" con contraseña "peliculas2026"
    Y estoy en "/ingresar"

  Escenario: Login exitoso con redirección
    Dado que intenté abrir el perfil "/u/cinefilo" sin sesión y la URL es "/ingresar?next=/u/cinefilo"
    Cuando ingreso "gonza@mail.com" y "peliculas2026" y presiono "Iniciar sesión"
    Entonces quedo con sesión iniciada
    Y soy redirigido a "/u/cinefilo"

  Escenario: El catálogo no exige login
    Dado que soy un visitante sin sesión
    Cuando navego a la Home, a una búsqueda de títulos o al detalle de una película
    Entonces veo el contenido sin ser redirigido a "/ingresar"

  Esquema del escenario: Rutas que exigen login redirigen
    Dado que soy un visitante sin sesión
    Cuando navego a "<ruta>"
    Entonces soy redirigido a "/ingresar?next=<ruta>"

    # /u/:username está fijado en 00-decisiones (F4). Los nombres de las otras rutas
    # los define la spec 03-favoritos-perfiles; si difieren, gana esa spec.
    Ejemplos:
      | ruta            |
      | /u/cinefilo     |
      | /perfil         |
      | /usuarios       |

  Esquema del escenario: Credenciales inválidas no revelan la causa
    Cuando ingreso "<email>" y "<pass>" y presiono "Iniciar sesión"
    Entonces veo "Email o contraseña incorrectos"
    Y el campo contraseña se vacía
    Y sigo en "/ingresar"

    Ejemplos:
      | email               | pass           |
      | gonza@mail.com      | otraClave99    |
      | noexiste@mail.com   | peliculas2026  |
      | soloGoogle@gmail.com| cualquiera1    |

  Escenario: Demasiados intentos fallidos
    Dado que fallé 5 veces en los últimos 15 minutos con "gonza@mail.com" desde mi IP
    Cuando intento iniciar sesión otra vez
    Entonces veo "Demasiados intentos. Probá de nuevo en 15 minutos."
    Y el botón "Iniciar sesión" queda deshabilitado con una cuenta regresiva

  Escenario: Parámetro next externo es ignorado
    Dado que la URL es "/ingresar?next=//evil.com"
    Cuando inicio sesión correctamente
    Entonces soy redirigido a "/"

  Escenario: Usuario logueado visita /ingresar
    Dado que tengo una sesión activa
    Cuando navego a "/ingresar"
    Entonces soy redirigido a "/"
```

```gherkin
# language: es
Característica: Sesión persistida con tokens

  Escenario: La sesión sobrevive a recargar la página
    Dado que inicié sesión hace 2 días
    Cuando recargo la página
    Entonces la app obtiene un nuevo access token usando la cookie de refresh
    Y veo mi avatar sin pasar por la pantalla de login
    Y en ningún momento se muestra la pantalla de login

  Escenario: Access token vencido durante el uso
    Dado que mi access token venció hace 1 minuto
    Cuando hago una acción que llama a la API
    Entonces la app renueva el token de forma transparente
    Y la acción se completa sin que yo note nada

  Escenario: Dos pestañas renuevan al mismo tiempo
    Dado que tengo dos pestañas abiertas con el access token vencido
    Cuando ambas hacen una request al mismo tiempo
    Entonces solo una solicitud de refresh rota el token
    Y ninguna pestaña pierde la sesión

  Escenario: Reuso de un refresh token ya rotado
    Dado que un refresh token fue rotado hace más de 10 segundos
    Cuando alguien lo vuelve a presentar en "/api/auth/refresh"
    Entonces se revocan todos los tokens de esa familia
    Y la respuesta es 401 "SESSION_REVOKED"
    Y en mi navegador veo "Tu sesión se cerró por seguridad. Iniciá sesión de nuevo."

  Escenario: Refresh token vencido
    Dado que no abrí la app en 31 días
    Cuando abro la app
    Entonces quedo como visitante sin ver ningún mensaje de error

  Escenario: El usuario de sesión incluye username y avatar
    Dado que tengo sesión iniciada y subí un avatar
    Cuando la app consulta "GET /api/auth/me"
    Entonces la respuesta incluye mi "username" y un "avatarUrl" del bucket "avatars" de Supabase Storage
    Y el header muestra mi foto de avatar

  Escenario: Usuario sin avatar ve sus iniciales
    Dado que tengo sesión iniciada y nunca subí un avatar
    Cuando la app consulta "GET /api/auth/me"
    Entonces "avatarUrl" es null
    Y el header muestra mis iniciales "GA"

  Escenario: El menú de usuario lleva a mi perfil público
    Dado que tengo sesión iniciada como "gonza_97"
    Cuando abro el menú de mi avatar y presiono "Mi perfil"
    Entonces navego a "/u/gonza_97"

  Escenario: El access token no se persiste
    Dado que tengo sesión iniciada
    Entonces ni localStorage ni sessionStorage contienen el access token
    Y la cookie de refresh es HttpOnly y no es accesible desde JavaScript
```

```gherkin
# language: es
Característica: Cerrar sesión

  Escenario: Logout desde el menú de usuario
    Dado que tengo sesión iniciada y dos pestañas abiertas
    Cuando abro el menú de mi avatar y presiono "Cerrar sesión"
    Entonces se revoca el refresh token de esta sesión
    Y se elimina la cookie de refresh
    Y ambas pestañas quedan como visitante
    Y soy redirigido a "/"

  Escenario: Logout no afecta otros dispositivos
    Dado que tengo sesión en mi notebook y en mi celular
    Cuando cierro sesión en la notebook
    Entonces mi sesión en el celular sigue activa

  Escenario: Logout sin conexión
    Dado que perdí la conexión
    Cuando presiono "Cerrar sesión"
    Entonces quedo como visitante localmente
    Y la app reintenta revocar el token cuando vuelve la conexión
```

```gherkin
# language: es
Característica: Recuperar contraseña por email

  Escenario: Solicitud de link con email existente
    Dado que existe una cuenta con "gonza@mail.com"
    Y estoy en "/recuperar-contrasena"
    Cuando ingreso "gonza@mail.com" y presiono "Enviar link"
    Entonces veo "Si existe una cuenta con ese email, te enviamos un link para restablecer tu contraseña."
    Y se envía un email con un link válido por 60 minutos

  Escenario: Solicitud con email inexistente
    Cuando ingreso "noexiste@mail.com" y presiono "Enviar link"
    Entonces veo exactamente el mismo mensaje de confirmación
    Y no se envía ningún email

  Escenario: Pedir un segundo link invalida el primero
    Dado que pedí un link de recuperación
    Cuando pido otro link
    Entonces el primer link deja de ser válido
    Y solo el último link permite restablecer la contraseña

  Escenario: Exceso de solicitudes
    Dado que pedí 3 links para "gonza@mail.com" en la última hora
    Cuando pido uno más
    Entonces veo el mismo mensaje genérico
    Y no se envía un cuarto email
```

```gherkin
# language: es
Característica: Restablecer contraseña

  Escenario: Reset exitoso
    Dado que abro un link de recuperación válido
    Entonces veo "Creá una nueva contraseña para g***@mail.com"
    Cuando ingreso y confirmo "nuevaClave2026" y presiono "Guardar contraseña"
    Entonces mi contraseña se actualiza
    Y se cierran todas mis sesiones en todos los dispositivos
    Y soy redirigido a "/ingresar" con el aviso "Contraseña actualizada. Ya podés iniciar sesión."

  Esquema del escenario: Link no utilizable
    Dado que abro un link de recuperación que está "<estado>"
    Entonces veo "Este link ya no es válido"
    Y veo el botón "Pedir un link nuevo"

    Ejemplos:
      | estado        |
      | expirado      |
      | ya usado      |
      | reemplazado   |
      | inexistente   |

  Escenario: Nueva contraseña igual a la actual
    Dado que abro un link de recuperación válido
    Cuando ingreso mi contraseña actual como nueva
    Entonces veo "La nueva contraseña tiene que ser distinta de la actual."

  Escenario: Cuenta solo-Google crea su contraseña
    Dado que mi cuenta fue creada con Google y no tiene contraseña
    Cuando completo el flujo de recuperación
    Entonces puedo iniciar sesión tanto con Google como con email y contraseña

  Escenario: Abrir el link con sesión iniciada
    Dado que tengo una sesión activa
    Cuando abro un link de recuperación válido
    Entonces mi sesión local se cierra
    Y veo el formulario de nueva contraseña
```

```gherkin
# language: es
Característica: Iniciar sesión o registrarse con Google

  Escenario: Usuario ya vinculado a Google
    Dado que mi cuenta tiene Google vinculado
    Cuando presiono "Continuar con Google" y elijo mi cuenta
    Entonces quedo con sesión iniciada
    Y soy redirigido según el parámetro next o a "/"

  Escenario: Vinculación automática con cuenta existente por email
    Dado que tengo una cuenta con email y contraseña "gonza@gmail.com" sin Google vinculado
    Cuando presiono "Continuar con Google" con la cuenta de Google "gonza@gmail.com" verificada
    Entonces Google queda vinculado a mi cuenta existente
    Y quedo con sesión iniciada
    Y puedo seguir entrando también con mi contraseña

  Escenario: Alta nueva vía Google requiere elegir ID
    Dado que no existe ninguna cuenta con mi email de Google
    Cuando presiono "Continuar con Google" y elijo mi cuenta
    Entonces soy llevado a "/completar-perfil"
    Y veo mi nombre y apellido prellenados desde Google
    Y veo un ID sugerido derivado de mi email
    Cuando confirmo un ID disponible y presiono "Empezar"
    Entonces se crea mi cuenta sin contraseña y con email verificado
    Y mi cuenta no tiene avatar, por lo que veo mis iniciales en el header
    Y quedo con sesión iniciada

  Escenario: Abandono del onboarding
    Dado que estoy en "/completar-perfil" tras elegir mi cuenta de Google
    Cuando cierro la pestaña sin confirmar
    Entonces no se crea ninguna cuenta

  Escenario: Onboarding expirado
    Dado que estoy en "/completar-perfil" hace más de 15 minutos
    Cuando presiono "Empezar"
    Entonces veo "Tu sesión de Google expiró. Volvé a intentarlo."
    Y soy llevado a "/registro"

  Escenario: Usuario cancela el popup de Google
    Cuando presiono "Continuar con Google" y cierro el popup
    Entonces no veo ningún mensaje de error
    Y el botón vuelve a estar habilitado

  Escenario: Email de Google no verificado
    Dado que mi cuenta de Google tiene el email sin verificar
    Cuando presiono "Continuar con Google"
    Entonces veo "No pudimos verificar tu email de Google. Registrate con email y contraseña."
```

---

## 8. Mockups ASCII

### 8.1 Registro, desktop (≥1024 px), estado vacío

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◉ VISION MAX                                                    Explorar   [ Ingresar ]   │
├───────────────────────────────────────────────────────┬──────────────────────────────────┤
│░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░│                                  │
│░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░│   Creá tu cuenta                 │
│░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░│   Guardá tus favoritos y         │
│░░ (collage de backdrops en tendencia, gradiente ░░░░░│   descubrí otros perfiles.       │
│░░  a negro hacia la derecha y hacia abajo)  ░░░░░░░░░│                                  │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  ┌────────────────────────────┐  │
│                                                       │  │ G  Continuar con Google    │  │
│   Todo el cine,                                       │  └────────────────────────────┘  │
│   en un solo lugar.                                   │  ──────────── o ────────────     │
│                                                       │                                  │
│   Millones de películas y series                      │  ID                              │
│   para descubrir.                                     │  ┌────────────────────────────┐  │
│                                                       │  │ @                          │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  Nombre           Apellido       │
│                                                       │  ┌────────────┐  ┌────────────┐  │
│                                                       │  │            │  │            │  │
│                                                       │  └────────────┘  └────────────┘  │
│                                                       │  Email                           │
│                                                       │  ┌────────────────────────────┐  │
│                                                       │  │                            │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  Contraseña                      │
│                                                       │  ┌────────────────────────┬───┐  │
│                                                       │  │                        │ ◎ │  │
│                                                       │  └────────────────────────┴───┘  │
│                                                       │  ○ 8+ caracteres  ○ una letra    │
│                                                       │  ○ un número                     │
│                                                       │  Confirmar contraseña            │
│                                                       │  ┌────────────────────────┬───┐  │
│                                                       │  │                        │ ◎ │  │
│                                                       │  └────────────────────────┴───┘  │
│                                                       │  ┌────────────────────────────┐  │
│                                                       │  │        Crear cuenta        │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  Al crear tu cuenta aceptás los  │
│                                                       │  Términos y la Política de       │
│                                                       │  privacidad.                     │
│                                                       │  ¿Ya tenés cuenta? Iniciá sesión │
└───────────────────────────────────────────────────────┴──────────────────────────────────┘
```

### 8.2 Registro, estado con errores y chequeo de ID en vivo

```
                                                        ┌──────────────────────────────────┐
                                                        │  ID                              │
                                                        │  ┌────────────────────────┬───┐  │
                                                        │  │ @cinefilo              │ ✕ │  │  ← borde rojo
                                                        │  └────────────────────────┴───┘  │
                                                        │  ✕ Ese ID ya está en uso.        │
                                                        │                                  │
                                                        │  ID (alternativa: disponible)    │
                                                        │  ┌────────────────────────┬───┐  │
                                                        │  │ @cinefilo_97           │ ✓ │  │  ← borde verde sutil
                                                        │  └────────────────────────┴───┘  │
                                                        │  ✓ Disponible                    │
                                                        │                                  │
                                                        │  Email                           │
                                                        │  ┌────────────────────────────┐  │
                                                        │  │ gonza@mail.com             │  │  ← borde rojo
                                                        │  └────────────────────────────┘  │
                                                        │  ✕ Ya existe una cuenta con este │
                                                        │    email. ¿Querés iniciar sesión?│
                                                        │                                  │
                                                        │  Contraseña                      │
                                                        │  ┌────────────────────────┬───┐  │
                                                        │  │ ••••••                 │ ◎ │  │
                                                        │  └────────────────────────┴───┘  │
                                                        │  ✕ 8+ caracteres  ✓ una letra    │
                                                        │  ✓ un número                     │
                                                        │                                  │
                                                        │  Confirmar contraseña            │
                                                        │  ┌────────────────────────┬───┐  │
                                                        │  │ •••••••                │ ◎ │  │
                                                        │  └────────────────────────┴───┘  │
                                                        │  ✕ Las contraseñas no coinciden. │
                                                        │                                  │
                                                        │  ┌────────────────────────────┐  │
                                                        │  │   ◌  Creando cuenta…       │  │  ← estado loading
                                                        │  └────────────────────────────┘  │
                                                        └──────────────────────────────────┘
```

### 8.3 Login, desktop, con error de credenciales

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◉ VISION MAX                                                    Explorar   [ Registrate ] │
├───────────────────────────────────────────────────────┬──────────────────────────────────┤
│░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░░░▓▓▓▓░░▒▒▒▒▒░░▓▓▓▓▓░░▒▒▒▒░│                                  │
│░░ (collage de backdrops) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   Bienvenido de nuevo            │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│                                  │
│                                                       │  ┌────────────────────────────┐  │
│   Seguí donde lo dejaste.                             │  │ G  Continuar con Google    │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  ──────────── o ────────────     │
│                                                       │                                  │
│                                                       │  ┌────────────────────────────┐  │
│                                                       │  │ ⚠ Email o contraseña       │  │  ← alerta, role=alert
│                                                       │  │   incorrectos              │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  Email                           │
│                                                       │  ┌────────────────────────────┐  │
│                                                       │  │ gonza@mail.com             │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  Contraseña  ¿Olvidaste tu       │
│                                                       │              contraseña?         │
│                                                       │  ┌────────────────────────┬───┐  │
│                                                       │  │                        │ ◎ │  │  ← vaciado, con foco
│                                                       │  └────────────────────────┴───┘  │
│                                                       │  ┌────────────────────────────┐  │
│                                                       │  │       Iniciar sesión       │  │
│                                                       │  └────────────────────────────┘  │
│                                                       │  ¿Te registraste con Google?     │
│                                                       │  Usá el botón de Google.         │
│                                                       │                                  │
│                                                       │  ¿No tenés cuenta? Registrate    │
└───────────────────────────────────────────────────────┴──────────────────────────────────┘
```

### 8.4 Login, rate limit alcanzado

```
                                                        ┌──────────────────────────────────┐
                                                        │  ┌────────────────────────────┐  │
                                                        │  │ ⏱ Demasiados intentos.     │  │
                                                        │  │   Probá de nuevo en 14:52. │  │
                                                        │  └────────────────────────────┘  │
                                                        │  Email                           │
                                                        │  ┌────────────────────────────┐  │
                                                        │  │ gonza@mail.com             │  │
                                                        │  └────────────────────────────┘  │
                                                        │  Contraseña                      │
                                                        │  ┌────────────────────────┬───┐  │
                                                        │  │                        │ ◎ │  │
                                                        │  └────────────────────────┴───┘  │
                                                        │  ┌────────────────────────────┐  │
                                                        │  │  Iniciar sesión  (14:52)   │  │  ← deshabilitado
                                                        │  └────────────────────────────┘  │
                                                        │  ¿Olvidaste tu contraseña?       │
                                                        └──────────────────────────────────┘
```

### 8.5 Recuperar contraseña: formulario y confirmación

```
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  ← Volver a iniciar sesión       │        │  ← Volver a iniciar sesión       │
│                                  │        │                                  │
│  ¿Olvidaste tu contraseña?       │        │          ┌────────┐              │
│  Ingresá tu email y te enviamos  │        │          │  ✉  ✓  │              │
│  un link para crear una nueva.   │        │          └────────┘              │
│                                  │        │  Revisá tu correo                │
│  Email                           │        │                                  │
│  ┌────────────────────────────┐  │        │  Si existe una cuenta con ese    │
│  │                            │  │  ───▶  │  email, te enviamos un link para │
│  └────────────────────────────┘  │        │  restablecer tu contraseña.      │
│                                  │        │  El link vence en 60 minutos.    │
│  ┌────────────────────────────┐  │        │                                  │
│  │        Enviar link         │  │        │  ¿No llegó? Revisá spam o        │
│  └────────────────────────────┘  │        │  [ Reenviar link ] (en 0:45)     │
└──────────────────────────────────┘        └──────────────────────────────────┘
        estado inicial                              estado enviado
```

### 8.6 Restablecer contraseña: válido e inválido

```
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  Creá una nueva contraseña       │        │          ┌────────┐              │
│  para g***@mail.com              │        │          │   ⚠    │              │
│                                  │        │          └────────┘              │
│  Nueva contraseña                │        │  Este link ya no es válido       │
│  ┌────────────────────────┬───┐  │        │                                  │
│  │                        │ ◎ │  │        │  Puede haber vencido, ya haberse │
│  └────────────────────────┴───┘  │        │  usado o haber sido reemplazado  │
│  ○ 8+ caracteres  ○ una letra    │        │  por uno más nuevo.              │
│  ○ un número                     │        │                                  │
│  Confirmar contraseña            │        │  ┌────────────────────────────┐  │
│  ┌────────────────────────┬───┐  │        │  │    Pedir un link nuevo     │  │
│  │                        │ ◎ │  │        │  └────────────────────────────┘  │
│  └────────────────────────┴───┘  │        │  Volver a iniciar sesión         │
│                                  │        └──────────────────────────────────┘
│  ⓘ Al guardar se cerrará tu      │                 token inválido
│    sesión en todos tus           │
│    dispositivos.                 │
│  ┌────────────────────────────┐  │
│  │     Guardar contraseña     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
        token válido
```

### 8.7 Login con aviso de contraseña actualizada (flash)

```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ ✓ Contraseña actualizada.  │  │  ← verde, se descarta con ✕
│  │   Ya podés iniciar sesión. │✕ │
│  └────────────────────────────┘  │
│  Bienvenido de nuevo             │
│  …(form de login normal)…        │
└──────────────────────────────────┘
```

### 8.8 Completar perfil (alta nueva vía Google)

```
┌──────────────────────────────────────────┐
│   ┌──┐                                   │
│   │GA│  gonza@gmail.com  · Google ✓      │
│   └──┘                                   │
│                                          │
│   Un último paso                         │
│   Elegí tu ID público. Así te van a      │
│   ver otros usuarios.                    │
│                                          │
│   ID                                     │
│   ┌──────────────────────────────┬───┐   │
│   │ @gonza                       │ ✓ │   │  ← sugerido, editable
│   └──────────────────────────────┴───┘   │
│   ✓ Disponible                           │
│   Nombre               Apellido          │
│   ┌──────────────┐    ┌──────────────┐   │
│   │ Gonzalo      │    │ Argüello     │   │  ← prellenados
│   └──────────────┘    └──────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │             Empezar              │   │
│   └──────────────────────────────────┘   │
│   Cancelar y volver                      │
└──────────────────────────────────────────┘
```

### 8.9 Header: estados de sesión y menú de logout

```
Bootstrapping (refresh en curso):
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ VISION MAX      Películas  Series  Buscar ⌕               [░░░░]  │  ← skeleton
└──────────────────────────────────────────────────────────────────────┘

Anónimo:
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ VISION MAX      Películas  Series  Buscar ⌕   Ingresar [Registrate]│
└──────────────────────────────────────────────────────────────────────┘

Autenticado + menú abierto (con avatar: foto circular; sin avatar: iniciales (GA)):
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ VISION MAX      Películas  Series  Buscar ⌕                  (◐)▾  │  ← avatarUrl
└──────────────────────────────────────────────────────┬───────────────┤
                                                       │ Gonzalo A.    │
                                                       │ @gonza_97     │
                                                       ├───────────────┤
                                                       │ Mi perfil     │  → /u/gonza_97
                                                       │ Mis favoritos │
                                                       ├───────────────┤
                                                       │ ⎋ Cerrar      │
                                                       │   sesión      │
                                                       └───────────────┘

Toast tras revocación por seguridad:
                                          ┌──────────────────────────────┐
                                          │ ⚠ Tu sesión se cerró por     │
                                          │   seguridad. Iniciá sesión   │
                                          │   de nuevo.   [Ingresar]   ✕ │
                                          └──────────────────────────────┘
```

### 8.10 Mobile (<768 px): login y registro

```
   Login (375 px)                         Registro (375 px), con error
┌─────────────────────────┐            ┌─────────────────────────┐
│ ←        ◉ VISION MAX   │            │ ←        ◉ VISION MAX   │
├─────────────────────────┤            ├─────────────────────────┤
│▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒│ 160px      │▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒│ 120px
│▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒▒▓▓░▒│ posters    │░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░│ +gradiente │ Creá tu cuenta          │
│ Bienvenido de nuevo     │            │                         │
│                         │            │┌───────────────────────┐│
│┌───────────────────────┐│            ││ G Continuar con Google││
││ G Continuar con Google││            │└───────────────────────┘│
│└───────────────────────┘│            │──────── o ────────      │
│──────── o ────────      │            │ ID                      │
│ Email                   │            │┌─────────────────────┬─┐│
│┌───────────────────────┐│            ││ @cinefilo           │✕││
││                       ││ 48px       │└─────────────────────┴─┘│
│└───────────────────────┘│            │ ✕ Ese ID ya está en uso.│
│ Contraseña              │            │ Nombre                  │
│┌────────────────────┬──┐│            │┌───────────────────────┐│
││                    │◎ ││            ││                       ││
│└────────────────────┴──┘│            │└───────────────────────┘│
│ ¿Olvidaste tu contraseña?│           │ Apellido                │
│                         │            │┌───────────────────────┐│
│ ¿No tenés cuenta?       │            ││                       ││
│ Registrate              │            │└───────────────────────┘│
│                         │            │ Email                   │
│                         │            │ …(sigue: contraseña,    │
│                         │            │  confirmación, legal)   │
├─────────────────────────┤            ├─────────────────────────┤
│┌───────────────────────┐│ sticky     │┌───────────────────────┐│ sticky
││    Iniciar sesión     ││ CTA        ││     Crear cuenta      ││ CTA
│└───────────────────────┘│            │└───────────────────────┘│
└─────────────────────────┘            └─────────────────────────┘
  Nombre y Apellido se apilan en mobile (en desktop van en 2 columnas).
```

### 8.11 Mobile: header autenticado y menú (sheet inferior)

```
┌─────────────────────────┐
│ ☰   ◉ VISION MAX  (GA)  │
├─────────────────────────┤
│                         │
│   (contenido atenuado)  │
│                         │
├─────────────────────────┤
│ ───                     │  ← handle del bottom sheet
│ Gonzalo Argüello        │
│ @gonza_97               │
│─────────────────────────│
│ Mi perfil               │  → /u/gonza_97
│ Mis favoritos           │
│─────────────────────────│
│ ⎋ Cerrar sesión         │
└─────────────────────────┘
```

---

## 9. Plantilla de email de recuperación

```
Asunto: Restablecé tu contraseña de Vision Max

Hola Gonzalo,

Recibimos un pedido para restablecer la contraseña de tu cuenta (@gonza_97).

   [ Crear nueva contraseña ]   →  {APP_URL}/restablecer-contrasena?token=…

El link vence en 60 minutos y se puede usar una sola vez.
Si no fuiste vos, ignorá este mail: tu contraseña no va a cambiar.

— El equipo de Vision Max
```
El remitente es `MAIL_FROM` (por ejemplo, `Vision Max <no-responder@…>`).

---

## 10. Dependencias con otros módulos
- **02 Catálogo (proxy TMDB con caché en Postgres):** provee los backdrops de tendencia para el collage de auth. Si falla, se usa un gradiente sólido de fallback.
- **03 Favoritos y perfiles:** consume `requireAuth` y `req.user.id`. Es dueño de la subida de avatares a Supabase Storage y escribe `users.avatar_key` y `users.avatar_updated_at`. Reutiliza el helper de `avatarUrl` de este módulo y la lista de usernames reservados de `packages/shared`. Expone el perfil público en `/u/:username`.
- **Layout/Header global:** consume `auth.status` y `auth.user` (incluido `avatarUrl`).
- **`packages/shared`:** esquemas zod y tipos de auth que consumen `apps/client` y `apps/server`.

---

## 11. Definición de "terminado"
- [ ] Todos los escenarios Gherkin de la sección 7 pasan como tests automatizados (integración y componentes).
- [ ] Ningún token aparece en `localStorage` ni `sessionStorage`. La cookie de refresh es `HttpOnly`.
- [ ] Los mockups 8.1 a 8.11 están implementados y se ven correctos a 375, 768 y 1280 px.
- [ ] `.env.example` completo en `apps/server` y `apps/client`. Ningún secreto está commiteado.
- [ ] Los esquemas de validación existen una sola vez, en `packages/shared`, y los usan front y back.
- [ ] `GET /api/auth/me` devuelve `username` y `avatarUrl` (`null` sin avatar).
- [ ] Las tablas de auth en Supabase tienen RLS activo sin políticas, así que no se pueden leer con la `anon key`.
- [ ] Lighthouse a11y ≥ 95 en `/ingresar` y `/registro`.

---

## 12. Notas menores (no bloqueantes)
- Copy en voseo rioplatense: se puede neutralizar si el resto de la app lo decide.

---

## 13. Asunciones validadas

El usuario validó las 10 asunciones del borrador, todas en la opción originalmente asumida. La numeración coincide con `docs/specs/00-decisiones.md`.

| # | Tema | Decisión validada | Dónde impacta |
|---|---|---|---|
| A1 | Estrategia de tokens | **Confirmada.** JWT de acceso de 15 min y refresh opaco de 30 días (deslizante), rotativo, guardado hasheado en la DB, con detección de reuso y ventana de gracia de 10 s | RN-16 a RN-19, §2.2, E4, §3.1 |
| A2 | Almacenamiento en el cliente | **Confirmada.** Access token solo en memoria (Redux); refresh en cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/auth` | RN-20, RN-21, cookie `rt`, §4.2 |
| A3 | Google con email ya registrado | **Confirmada.** Vinculación automática si Google marca `email_verified = true` | RN-34.2, Gherkin "Vinculación automática" |
| A4 | Campo "ID" | **Confirmada.** Username público único (`[a-z0-9_]`, 3 a 20 caracteres, empieza con letra, sin reservados). Es la URL del perfil `/u/:username`. El login es **solo con email**. Las altas vía Google lo eligen en `/completar-perfil` | RN-02, RN-12, RN-34.3, §2.1, mockup 8.8 |
| A5 | Verificación de email | **Confirmada.** No se verifica. El registro deja la sesión iniciada al instante | RN-10, `email_verified_at` |
| A6 | Integración con Google | **Como se asumió.** Google Identity Services (ID token) verificado en el backend con `google-auth-library` | RN-33, E10, E11 |
| A7 | Proveedor de email | **Como se asumió.** Nodemailer + SMTP genérico configurable por env (Mailpit/Ethereal en desarrollo) | §6, §6.1, caso borde 19 |
| A8 | Link de reseteo | **Como se asumió.** 60 min, un solo uso, el último invalida a los anteriores y al usarlo se revocan todas las sesiones | RN-27, RN-31, §2.3 |
| A9 | Política de contraseña | **Como se asumió.** De 8 a 72 caracteres (en bytes), al menos una letra y un número, distinta de email e ID; bcrypt con costo 12 | RN-06, RN-07, §4.4 |
| A10 | Fuerza bruta | **Como se asumió.** Rate limit de 5 fallos por email+IP cada 15 min (429), sin bloqueo de cuenta; store en Supabase Postgres | RN-14, RN-28, §2.4 |

**Decisiones transversales incorporadas (de `00-decisiones.md`):**
- La marca es Vision Max.
- El repo es un monorepo TypeScript con npm workspaces (`apps/client`, `apps/server`, `packages/shared`, este último con los esquemas zod).
- La DB es Supabase Postgres vía `DATABASE_URL` (pooler), sin Supabase Auth.
- `users` suma `avatar_key` y `avatar_updated_at`; los avatares viven en Supabase Storage (bucket `avatars`).
- `GET /api/auth/me` devuelve `username` y `avatarUrl`.
- El perfil público está en `/u/:username` y exige login; el catálogo es público.
