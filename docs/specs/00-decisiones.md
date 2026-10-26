# Vision Max: decisiones validadas

Fuente de verdad transversal para las specs 01-auth, 02-catalogo y 03-favoritos-perfiles. Si una spec contradice este archivo, gana este archivo.

## Globales

| Tema | Decisión |
|---|---|
| Nombre de la app | **Vision Max** (reemplaza los provisorios CINEMA / CINEMAX) |
| Lenguaje y repo | TypeScript en front y back. Monorepo con npm workspaces: `apps/client` (Vite + React + Redux Toolkit / RTK Query), `apps/server` (Express + Sequelize), `packages/shared` (esquemas zod y tipos compartidos) |
| Base de datos | Supabase Postgres, conectada por `DATABASE_URL` (pooler). Sequelize con migraciones. **No** se usa Supabase Auth: el auth es propio |
| Almacenamiento de archivos | Supabase Storage: bucket público `avatars`. El backend sube los archivos con `SUPABASE_SERVICE_ROLE_KEY`. Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AVATARS_BUCKET` |
| Grillas | Scroll infinito con páginas de 20 y botón "Reintentar" si falla, en **todas** las grillas: búsqueda, explorar, mis favoritos y perfiles ajenos |
| Visibilidad | El catálogo (Home, búsqueda, detalle) es público. Los perfiles y la búsqueda de usuarios exigen login |
| Diseño | design-taste-frontend: tema oscuro, Tailwind v4 + Motion, VARIANCE 6 / MOTION 5 / DENSITY 5 |

## Formato de error de la API

Todos los módulos responden los errores con el mismo formato (tipo `ApiError` en `packages/shared`):

```json
{ "error": { "code": "INVALID_YEAR", "message": "El año no es válido.", "fields": { "anio": "…" }, "meta": {} } }
```

`fields` y `meta` son opcionales. Cuando una spec escribe `{ error: "CODE" }`, es una abreviatura de `error.code`.

## Mapa de rutas del frontend

| Ruta | Módulo | Acceso |
|---|---|---|
| `/` | 02 Catálogo (Home) | Público |
| `/buscar?q=&tipo=&anio=` | 02 Catálogo | Público |
| `/explorar/tendencias/:tipo`, `/explorar/proximamente/:tipo` | 02 Catálogo | Público |
| `/pelicula/:id-slug`, `/serie/:id-slug` | 02 Catálogo | Público |
| `/ingresar?next=`, `/registro`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/completar-perfil` | 01 Auth | Solo sin sesión (`/completar-perfil`: alta con Google) |
| `/perfil` | 03 Favoritos (Mi perfil) | Logueado |
| `/usuarios?q=` | 03 Favoritos (buscar usuarios) | Logueado |
| `/u/:username` | 03 Favoritos (perfil ajeno) | Logueado |

Toda ruta protegida redirige a `/ingresar?next=<ruta>`.

## Auth (01)

| # | Decisión |
|---|---|
| A1 | JWT de acceso de 15 min y token de renovación opaco de 30 días, rotativo y guardado hasheado en la DB, con detección de reuso |
| A2 | Token de acceso en memoria (Redux) y token de renovación en una cookie httpOnly, Secure, SameSite=Lax |
| A3 | Google se vincula automáticamente a una cuenta existente si el email está verificado |
| A4 | "ID" es un username público y único (`[a-z0-9_]`, de 3 a 20 caracteres). El login es solo con email |
| A5 | No se verifica el email en el registro |
| A6 a A10 | Quedan como se asumieron |
| Cruce | `users` suma `avatar_key` y `avatar_updated_at`. `GET /api/auth/me` devuelve `username` y `avatarUrl` |

## Catálogo (02)

| # | Decisión |
|---|---|
| C1 | **Proxy con caché persistente en Postgres.** Todo lo que se consulta a TMDB se guarda en tablas de la DB con un tiempo de vida por endpoint. Una capa en memoria por encima es opcional. La tabla `media` (tmdb_id + media_type únicos, título, póster, backdrop, fecha, puntaje, `fetched_at`) es **del módulo Catálogo** y la comparte Favoritos |
| C2 | Pestañas Películas / Series (`/search/movie` y `/search/tv`) |
| C3 | Scroll infinito (ver Globales) |
| C4 | Las series próximas son las que se estrenan en los próximos 90 días (`/discover/tv`) |
| C5 | Detalle completo sin episodios |
| C6 a C10 | Quedan como se asumieron |

## Favoritos y perfiles (03)

| # | Decisión |
|---|---|
| F1 | `Favorite` (user_id, media_id → `media`, created_at) apunta a la tabla compartida `media`. Al agregar un favorito, se hace upsert en `media` si el ítem no está |
| F2 | Avatares en Supabase Storage (ver Globales). Se mantienen el procesamiento a WebP de 512 y 128 px y los límites de F8 |
| F3 | Perfiles visibles solo con login, sin opción de privacidad |
| F4 | URL del perfil: `/u/:username` |
| F6 | Búsqueda parcial, sin acentos ni mayúsculas, por username, nombre o apellido |
| F10 | Scroll infinito (reemplaza "Cargar más"). Se mantienen el orden por más reciente y las pestañas por tipo |
| F5, F7, F8, F9 | Quedan como se asumieron |
