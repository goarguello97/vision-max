# Spec 03: Favoritos y Perfiles (Vision Max)

> **Estado:** FINAL. Las asunciones fueron revisadas con el usuario; las marcas `[F#]` remiten a la decisión validada correspondiente (sección 13 y `00-decisiones.md`). Si algo de esta spec contradice `00-decisiones.md`, gana ese archivo.

## 1. Historia de usuario

> Como usuario logueado quiero agregar y sacar películas o series de mis favoritos, verlos en mi pantalla de perfil, agregar una imagen a mi perfil, buscar otros usuarios y ver el perfil de un usuario específico con sus películas o series favoritas.

## 2. Alcance

**Incluye**
- Marcar y desmarcar una película o serie como favorita desde la card de las grillas del catálogo y desde la pantalla de detalle.
- Pantalla **Mi perfil**: datos básicos, @username, avatar, contadores y grilla de favoritos con filtro por tipo.
- Subir, reemplazar y eliminar la imagen de perfil (avatar).
- **Búsqueda de usuarios** por username, nombre o apellido.
- **Perfil de otro usuario** (`/u/:username`): datos públicos y su grilla de favoritos.
- Versión mobile (responsive) de todas las pantallas anteriores.

**No incluye (otros módulos, solo se referencian)**
- Modelo `User` base (`id`, `username`, `email`, `first_name`, `last_name`, contraseña), registro, login y tokens: **Módulo Auth (01)**. Este módulo usa su middleware `requireAuth` (pone `req.user = { id, username }`) y su `GET /api/auth/me`.
- Home, búsqueda de películas y series, detalle, proxy y caché de TMDB, tabla `media` y servicio `ensureMedia`: **Módulo Catálogo (02)**. Este módulo inserta el botón de favorito en `MediaCard` y en el hero del detalle.
- Edición de nombre, apellido, username, email o contraseña: módulo Auth / cuenta.
- Seguir usuarios, listas personalizadas, puntuaciones, comentarios y notificaciones.

## 3. Contexto técnico transversal (de `00-decisiones.md`)

| Tema | Decisión |
|---|---|
| App | **Vision Max** |
| Repo | Monorepo TypeScript con npm workspaces: `apps/client` (Vite + React + Redux Toolkit / RTK Query), `apps/server` (Express + Sequelize), `packages/shared` (esquemas zod y tipos compartidos) |
| Base de datos | Supabase Postgres por `DATABASE_URL` (pooler), Sequelize con migraciones. No se usa Supabase Auth |
| Archivos | Supabase Storage, bucket público `avatars`, escritura solo desde el backend con `SUPABASE_SERVICE_ROLE_KEY` |
| Grillas | Scroll infinito de a 20 con "Reintentar" si falla |
| Visibilidad | Catálogo público; perfiles y búsqueda de usuarios solo con login |
| Diseño | design-taste-frontend: tema oscuro, Tailwind v4 + Motion, VARIANCE 6 / MOTION 5 / DENSITY 5 |

Ubicación del código de este módulo:
- `apps/server/src/modules/favorites` y `apps/server/src/modules/profiles` (rutas, controladores, servicios, migraciones).
- `apps/client/src/features/favorites` y `apps/client/src/features/profiles` (páginas, componentes y endpoints de RTK Query).
- `packages/shared/src/favorites` y `packages/shared/src/profiles`: esquemas zod de params, queries y respuestas, como `FavoriteParams`, `FavoritesPage`, `PublicProfile`, `UserSearchQuery` y `UserSearchResult`. Los usan el server para validar y el client para tipar.

## 4. Glosario

| Término | Definición |
|---|---|
| Media | Película (`movie`) o serie (`tv`) de TMDB. Vive en la tabla `media` del Catálogo, única por `(tmdb_id, media_type)`. |
| Favorito | Relación usuario ↔ media creada explícitamente por el usuario. |
| Username / @handle | Identificador público y único del usuario (`[a-z0-9_]`, de 3 a 20 caracteres), definido por Auth. En la UI se muestra como `@handle`. |
| Avatar | Imagen de perfil cuadrada del usuario. |
| Perfil público | Vista de un usuario accesible por otros usuarios logueados (sin email ni id interno). |

## 5. Reglas de negocio

**Favoritos**
- **RN-01** Solo un usuario autenticado puede agregar o quitar favoritos, y solo en su propia cuenta.
- **RN-02** Un media es favorito como máximo una vez por usuario (unicidad `user_id + media_id`). Agregar algo que ya es favorito, o quitar algo que no lo es, son operaciones **idempotentes**: no dan error.
- **RN-03** Una película y una serie con el mismo `tmdbId` son medias distintos, porque TMDB usa espacios de ids separados y `media` es única por `(tmdb_id, media_type)`.
- **RN-04** El cliente envía solo `mediaType` + `tmdbId`. El backend llama a `ensureMedia(tmdbId, mediaType)` del Catálogo, que hace upsert en `media` si el ítem no está, y crea el favorito con ese `media_id`. Favorito **no** guarda una copia de los datos: el listado hace JOIN a `media` `[F1]`.
  - Si TMDB responde 404 y el media no está en la tabla, la respuesta es `404 MEDIA_NOT_FOUND`.
  - Si TMDB no responde y el media no está en la tabla, la respuesta es `502 UPSTREAM_UNAVAILABLE` y el favorito **no** se crea.
  - Si el media ya está en la tabla, el favorito se crea aunque TMDB no responda.
- **RN-05** No hay límite de favoritos por usuario.
- **RN-06** Los favoritos se listan del más reciente al más antiguo, según cuándo se agregaron (`favorites.created_at`). Se cargan con **scroll infinito de a 20**. Si falla una página se muestra "Reintentar" y hay pestañas Todos / Películas / Series con contadores `[F10]`.
- **RN-07** El corazón refleja el estado real en toda la app. Al iniciar sesión, el frontend carga el conjunto de ids de los favoritos del usuario y lo mantiene en Redux `[F5]`.
- **RN-08** Agregar y quitar usan **actualización optimista**: el corazón cambia al instante y, si el servidor falla, se revierte y aparece un toast de error `[F7]`.
- **RN-09** Al quitar un favorito desde la grilla de *Mi perfil*, la card sale con una animación y aparece el toast "Quitado de favoritos · Deshacer" durante 5 s. La baja se envía al servidor de inmediato. "Deshacer" vuelve a crear el favorito con un `created_at` nuevo, así que reaparece al principio de la lista `[F7]`.

**Avatar**
- **RN-10** Formatos aceptados: JPG, PNG y WebP. Tamaño máximo del archivo original: **5 MB**. Dimensión mínima: 128×128 px `[F8]`.
- **RN-11** El usuario recorta la imagen en un área **cuadrada** en el cliente antes de subirla. El servidor igual la normaliza a cuadrado (recorte centrado) por seguridad `[F8]`.
- **RN-12** El servidor re-codifica la imagen a WebP en dos tamaños (512×512 y 128×128), elimina los metadatos EXIF (incluida la ubicación) y descarta el original. Guarda ambas versiones en **Supabase Storage**, en el bucket público `avatars` `[F2]`.
- **RN-13** Cada subida genera una `avatar_key` nueva y versionada. Un avatar nuevo reemplaza al anterior y los archivos anteriores se borran del bucket.
- **RN-14** El usuario puede eliminar su avatar. En ese caso se muestra un **avatar por defecto** con sus iniciales (nombre + apellido) sobre un color que se deriva siempre igual de su username.

**Perfiles y búsqueda**
- **RN-15** Cualquier usuario logueado puede ver todos los perfiles. No hay configuración de privacidad. Un visitante anónimo que entra a un perfil o a la búsqueda es redirigido al login `[F3]`.
- **RN-16** El perfil público muestra avatar, nombre, apellido, `@username`, fecha de alta ("Miembro desde"), los contadores de favoritos (películas y series) y la grilla de favoritos. **Nunca** expone el email ni el `id` interno (UUID).
- **RN-17** La URL del perfil es `/u/:username`, y los endpoints públicos de perfil identifican al usuario por username `[F4]`. El username se compara sin distinguir mayúsculas. Si la URL trae mayúsculas, el frontend redirige (`replace`) a la versión en minúsculas. Si `:username` es el del usuario actual, redirige a `/perfil`.
- **RN-18** La búsqueda de usuarios requiere login `[F3]`. Busca por **username, nombre, apellido o "nombre apellido"**, con coincidencia parcial y sin distinguir mayúsculas ni acentos. **No** busca por email `[F6]`. Si el término empieza con `@`, el `@` se ignora.
- **RN-19** El término debe tener entre 2 y 50 caracteres, contados después de recortar espacios y sacar el `@` inicial. Con menos de 2 no se consulta al servidor.
- **RN-20** Los resultados excluyen al propio usuario `[F6]` y se ordenan así: (1) username exacto, (2) username, nombre o apellido que **empiezan** con el término, (3) el resto de las coincidencias. Dentro de cada grupo, orden alfabético por apellido y nombre. Se cargan con scroll infinito de a 20.
- **RN-21** En las cards de resultados y en las cabeceras de perfil, el username se muestra como `@handle`.
- **RN-22** En el perfil de otro usuario, los corazones de sus cards son interactivos y reflejan **mis** favoritos: puedo agregar a los míos algo que veo en su perfil. No modifican los favoritos del otro usuario `[F9]`.

## 6. Modelo de datos (Supabase Postgres + Sequelize)

### 6.1 Nueva tabla `favorites` (modelo `Favorite`) `[F1]`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id`, `ON DELETE CASCADE`, NOT NULL | |
| `media_id` | mismo tipo que `media.id` | FK → `media.id`, `ON DELETE RESTRICT`, NOT NULL | Tabla del módulo Catálogo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Fecha en que se agregó (orden de la grilla) |

Sin `updated_at`: un favorito no se edita, solo se crea o se borra.

**Índices**
- `UNIQUE (user_id, media_id)`: garantiza RN-02 aun con requests concurrentes.
- `(user_id, created_at DESC, id)`: listado paginado estable.
- `(media_id)`: para el FK y para saber si un media está referenciado.

El filtro por tipo usa `JOIN media ON media.id = favorites.media_id WHERE media.media_type = :type`. Para eso se apoya en el índice de `media` sobre `(id, media_type)` o en su PK; no se duplica `media_type` en `favorites`.

**Asociaciones:** `User.hasMany(Favorite)`, `Favorite.belongsTo(User)`, `Favorite.belongsTo(Media)` (el modelo `Media` lo exporta Catálogo) y `Media.hasMany(Favorite)`.

**Dependencias con la tabla `media` (Catálogo)**
- Columnas que usa este módulo: `id`, `tmdb_id`, `media_type`, título, `poster_path`, fecha de estreno, puntaje y `fetched_at`. Catálogo define los nombres exactos y Favoritos los toma tal cual.
- La limpieza o refresco de la caché del Catálogo **no puede borrar** filas de `media` referenciadas por `favorites` (por eso el FK es `RESTRICT`). El refresco por TTL actualiza la fila en el lugar, y así los favoritos muestran datos al día sin lógica propia.

### 6.2 Cambios a `users` (modelo `User`, de Auth)

Las dos columnas ya están acordadas con Auth (fila "Cruce" de `00-decisiones.md`). La migración vive en este módulo:

| Columna | Tipo | Notas |
|---|---|---|
| `avatar_key` | `VARCHAR(255)` NULL | Prefijo versionado del objeto en el bucket (sección 8). NULL = sin avatar. |
| `avatar_updated_at` | `TIMESTAMPTZ` NULL | Auditoría y ordenamiento de limpieza. |

- **Índices de búsqueda:** extensiones `pg_trgm` y `unaccent` (en Supabase se habilitan en el schema `extensions`). Hay un índice GIN trigram sobre `f_unaccent(lower(username || ' ' || first_name || ' ' || last_name))`; `f_unaccent` es un wrapper `IMMUTABLE` de `unaccent`. El índice único `CITEXT` de `username` (de Auth) cubre el lookup exacto.
- **Scope `public` de `User`:** devuelve solo `username, firstName, lastName, avatarUrl, avatarThumbUrl, createdAt`. **Nunca** `id`, `email`, `password_hash` ni `google_sub`.
- **`avatarUrl` y `avatarThumbUrl`:** son campos virtuales que se calculan a partir de `avatar_key` (sección 8.3). Valen `null` si no hay avatar.

## 7. API (Express, `apps/server`), prefijo `/api`

Todas las rutas requieren `Authorization: Bearer <accessToken>` (middleware `requireAuth` de Auth). Params, queries y respuestas se validan con los esquemas zod de `packages/shared`. Las respuestas de error usan el formato común de Auth: `{ "error": { "code": "STRING_CODE", "message": "Mensaje en español" } }`.

### 7.1 Favoritos del usuario actual

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/me/favorites?type=all\|movie\|tv&page=1&limit=20` | Lista paginada de mis favoritos (JOIN `media`) | `200` |
| `GET` | `/me/favorites/ids` | Todos los pares favoritos, para pintar corazones | `200` |
| `PUT` | `/me/favorites/:mediaType/:tmdbId` | Agrega el favorito (idempotente): `ensureMedia` + `INSERT … ON CONFLICT DO NOTHING` | `201` creado · `200` ya existía · `400` · `404 MEDIA_NOT_FOUND` · `502 UPSTREAM_UNAVAILABLE` |
| `DELETE` | `/me/favorites/:mediaType/:tmdbId` | Quita el favorito (idempotente) | `204` |

Ejemplo `GET /me/favorites`:
```json
{
  "items": [
    { "mediaType": "movie", "tmdbId": 603, "title": "Matrix", "posterPath": "/abc.jpg",
      "releaseDate": "1999-03-31", "voteAverage": 8.2, "addedAt": "2026-10-20T14:03:00Z" }
  ],
  "page": 1, "limit": 20, "totalItems": 37, "totalPages": 2, "hasMore": true,
  "counts": { "movie": 30, "tv": 7 }
}
```
Ejemplo `GET /me/favorites/ids`: `{ "items": ["movie:603", "tv:1399"] }`

Validaciones: `mediaType ∈ {movie, tv}`, `tmdbId` entero positivo, `page ≥ 1` y `1 ≤ limit ≤ 50`. Un `type` desconocido devuelve `400 INVALID_TYPE`.

### 7.2 Avatar

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `PUT` | `/me/avatar` | `multipart/form-data`, campo `avatar` | `200 { avatarUrl, avatarThumbUrl }` · `400 AVATAR_MISSING` · `413 AVATAR_TOO_LARGE` · `415 AVATAR_UNSUPPORTED_FORMAT` · `422 AVATAR_TOO_SMALL` · `429` · `502 STORAGE_UNAVAILABLE` |
| `DELETE` | `/me/avatar` | Elimina el avatar | `204` · `502 STORAGE_UNAVAILABLE` |

`GET /api/auth/me` (Auth) incluye `username`, `avatarUrl` y `avatarThumbUrl` (`null` si no hay avatar).

### 7.3 Usuarios `[F4]` `[F6]`

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| `GET` | `/users/search?q=texto&page=1` | Búsqueda por username, nombre o apellido | `200` · `400 QUERY_TOO_SHORT / QUERY_TOO_LONG` |
| `GET` | `/users/:username` | Perfil público | `200` · `404 USER_NOT_FOUND` |
| `GET` | `/users/:username/favorites?type=&page=&limit=` | Favoritos de ese usuario (mismo formato que 7.1) | `200` · `404 USER_NOT_FOUND` |

Un `:username` que no cumple `^[a-z0-9_]{3,20}$` (después de pasarlo a minúsculas) devuelve `404 USER_NOT_FOUND` sin consultar la DB.

Ejemplo `GET /users/jose_m`:
```json
{ "username": "jose_m", "firstName": "José", "lastName": "Martínez",
  "avatarUrl": "https://<proyecto>.supabase.co/storage/v1/object/public/avatars/…-512.webp",
  "avatarThumbUrl": "…-128.webp", "memberSince": "2026-01-14",
  "counts": { "movie": 12, "tv": 4 } }
```
Ejemplo `GET /users/search?q=jose`:
```json
{ "items": [ { "username": "jose_m", "firstName": "José", "lastName": "Martínez",
               "avatarThumbUrl": null, "counts": { "movie": 12, "tv": 4 } } ],
  "page": 1, "totalItems": 3, "totalPages": 1, "hasMore": false }
```

### 7.4 Rate limiting (por usuario)
- `PUT/DELETE /me/favorites/*`: 120 req/min.
- `PUT /me/avatar`: 10 req/hora.
- `GET /users/search`: 60 req/min.

Si se excede, la respuesta es `429 RATE_LIMITED` con el header `Retry-After`.

## 8. Almacenamiento de imágenes de perfil (Supabase Storage) `[F2]`

### 8.1 Bucket
- Bucket **público** `avatars` (nombre configurable con `SUPABASE_AVATARS_BUCKET`), con lectura pública por URL.
- La configuración del bucket limita los MIME permitidos a `image/webp` y el tamaño a 1 MB, que es el máximo de un archivo ya procesado.
- No hay políticas RLS de `INSERT`, `UPDATE` ni `DELETE` para `anon` ni `authenticated`: **solo el backend escribe**, con `SUPABASE_SERVICE_ROLE_KEY`.
- El cliente de Storage (`@supabase/supabase-js`) se instancia **solo en `apps/server`**. La service role key nunca va a `apps/client` ni a variables `VITE_*`.

### 8.2 Pipeline de subida
1. **Recepción:** `multer` con `memoryStorage`, `limits.fileSize = AVATAR_MAX_BYTES` (5 MB) y un solo archivo.
2. **Validación del contenido:** el formato se determina por los *magic bytes* (`sharp().metadata()`), no por la extensión ni por el `Content-Type` enviado. Se aceptan JPEG, PNG y WebP. Se rechazan SVG, GIF, HEIC y cualquier otro formato. Una imagen de menos de 128 px de lado devuelve `422`.
3. **Procesamiento (`sharp`):** rotación según EXIF, recorte cuadrado centrado y resize a 512×512 y 128×128. Salida WebP calidad 82, sin metadatos.
4. **Clave versionada:** `avatar_key = <uuid aleatorio>-<epoch ms>`. Es nueva en cada subida y **no** contiene el id del usuario, para no exponer la PK interna en una URL pública.
5. **Subida:** los dos objetos `<avatar_key>-512.webp` y `<avatar_key>-128.webp` se suben con `contentType: image/webp`, `cacheControl: 31536000` y `upsert: false`. Como la clave cambia en cada subida, se pueden cachear como inmutables.
6. **Persistencia:** se actualizan `users.avatar_key` y `avatar_updated_at`.
7. **Limpieza:** se borran del bucket los dos objetos de la clave anterior.

### 8.3 URL pública
`avatarUrl = ${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_AVATARS_BUCKET}/${avatar_key}-512.webp` (y `-128.webp` para `avatarThumbUrl`). Se arma en el backend; el frontend la usa tal cual.

### 8.4 Consistencia y fallas
- Si falla la subida a Storage, se cancela todo, la DB no cambia y se responde `502 STORAGE_UNAVAILABLE`.
- Si la subida sale bien pero falla la DB, se borran los objetos nuevos y se responde `500`.
- Si falla el borrado de los objetos viejos (paso 7), se loguea `warn` y la respuesta igual es `200`. Los huérfanos los limpia un script de mantenimiento: lista el bucket y borra las claves que no están en `users.avatar_key` y tienen más de 24 h.
- En `DELETE /me/avatar`, primero se pone `avatar_key = NULL` en la DB y después se borran los objetos. Si el borrado falla, quedan huérfanos para el mismo script.
- Interfaz `AvatarStorage` (`save`, `remove`, `publicUrl`) con implementación `SupabaseAvatarStorage`. En los tests se reemplaza por una implementación en memoria.

### 8.5 Variables de entorno (`apps/server`)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Supabase Postgres (pooler), la comparten todos los módulos |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Escritura en Storage. Secreta, solo en el server |
| `SUPABASE_AVATARS_BUCKET` | Nombre del bucket (default `avatars`) |
| `AVATAR_MAX_BYTES` | Máximo del archivo original (default `5242880`) |

Las claves de TMDB las define el módulo Catálogo.

## 9. Frontend (`apps/client`: React + Redux Toolkit + Vite)

### 9.1 Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/perfil` | Mi perfil | Logueado |
| `/usuarios` | Buscar usuarios (`?q=` sincronizado con el input) | Logueado |
| `/u/:username` | Perfil de otro usuario `[F4]` | Logueado |

Las rutas se protegen con el guard de Auth, que redirige a `/ingresar?next=<ruta>`. Se entra desde el menú del avatar en el header ("Mi perfil", "Buscar usuarios") y, en mobile, desde la navegación que define el layout global.

### 9.2 Estado (RTK Query)
- **`favoritesApi`:** `getMyFavoriteIds`, `getMyFavorites({ type, page })`, `addFavorite`, `removeFavorite` y `getUserFavorites({ username, type, page })`.
- **Paginación:** las grillas usan `infiniteQuery` de RTK Query (o `merge` + `forceRefetch` por página), con una caché separada por `type` `[F10]`.
- **Actualización optimista:** `addFavorite` y `removeFavorite` usan `onQueryStarted` + `updateQueryData` sobre `getMyFavoriteIds`, y sobre las páginas de *Mi perfil* si están en caché. Si falla, `patch.undo()` y un toast `[F7]`. Al terminar se invalidan los `counts`.
- **Selector:** `selectIsFavorite(mediaType, tmdbId)` lo usa `FavoriteButton` `[F5]`.
- **Clicks repetidos:** mientras hay una mutación en vuelo para un media, se ignoran los clicks sobre él (el estado visual ya cambió).
- **`usersApi`:** `searchUsers({ q, page })` (scroll infinito, debounce de 300 ms en el input) y `getUserProfile(username)`.
- **`profileApi`:** `uploadAvatar(file)` y `deleteAvatar()`. Al terminar se invalida el tag `Me` para refrescar el header.
- **Logout:** al cerrar sesión se resetea el estado de estas APIs.
- **Tipos:** todos salen de `packages/shared`.

### 9.3 Componentes
- **`FavoriteButton`:** dos variantes. `card` es un ícono sobre el póster; `detail` es un botón con texto ("Agregar a favoritos" / "En favoritos"). Tiene `aria-pressed`, `aria-label` dinámico y área táctil de al menos 44×44 px.
- **`ProfileHeader`:** avatar, nombre y apellido, `@username`, "Miembro desde" y contadores. La acción "Cambiar foto" aparece solo en el perfil propio.
- **`AvatarEditorModal`:** selección de archivo o drag & drop, recorte cuadrado con zoom, vista previa circular y errores. En mobile es un bottom sheet a pantalla completa.
- **`MediaTypeTabs`:** Todos / Películas / Series, con contadores.
- **`FavoritesGrid`:** reutiliza `MediaCard` del Catálogo con los datos de `media`. Usa un sentinel con `IntersectionObserver` para la página siguiente, una fila de skeletons mientras carga y un bloque "No pudimos cargar más · Reintentar" si falla. Al final muestra "No hay más favoritos" (solo si hubo más de una página).
- **`UserSearchInput`** y **`UserCard`**: el `UserCard` muestra avatar, nombre y apellido, `@handle` y contadores, y lleva a `/u/:username`.
- **`EmptyState`** y **`ErrorState`**: reutilizables.

### 9.4 Dirección visual
- Tema oscuro por defecto, Tailwind v4 y Motion, con la skill `design-taste-frontend` (VARIANCE 6 / MOTION 5 / DENSITY 5). La marca "Vision Max" aparece en el header global (del layout).
- **Corazón:** pasa de contorno a relleno con un spring corto (escala 1 → 1.2 → 1) en el color de acento. Con `prefers-reduced-motion` solo cambia el color, sin escala.
- **Cabecera de perfil:** banda de fondo hecha con los `backdrop_path` o pósters de sus 3 favoritos más recientes, desenfocada y oscurecida. Sin favoritos, gradiente neutro.
- **`@handle`:** en texto atenuado debajo del nombre, en tipografía tabular o mono suave.
- **Animaciones de la grilla:** las cards de *Mi perfil* salen con `AnimatePresence` + `layout`. Las páginas nuevas del scroll infinito entran con un fade escalonado sutil, sin desplazar el contenido ya visible.
- **Carga:** skeletons en grillas y resultados, nunca spinners a pantalla completa.
- **Grilla responsive:** 2 columnas (< 640 px), 3 (≥ 640), 4 (≥ 768), 5 (≥ 1024) y 6 (≥ 1280).

## 10. Casos borde

| # | Situación | Comportamiento |
|---|---|---|
| CB-01 | Un usuario no logueado toca un corazón en el catálogo | Redirige a `/ingresar?next=<url actual>`. Después del login vuelve a la página, **sin** agregar el favorito automáticamente. |
| CB-02 | Doble click o dos pestañas agregan el mismo media | La unicidad `(user_id, media_id)` y el `PUT` idempotente evitan duplicados. Ambas reciben éxito. |
| CB-03 | Dos usuarios agregan a la vez un media que no está en `media` | `ensureMedia` hace upsert sobre `(tmdb_id, media_type)`: una sola fila y ambos favoritos apuntan a ella. |
| CB-04 | El servidor falla al agregar o quitar (red, 5xx, 502) | Rollback del corazón y toast "No pudimos actualizar tus favoritos. Probá de nuevo." |
| CB-05 | El token vence durante la acción | 401: rollback. Auth renueva el token o redirige al login. |
| CB-06 | El media se borró de TMDB después de ser favorito | La fila de `media` sigue existiendo (FK `RESTRICT`) y la card se muestra con los últimos datos guardados. Al abrir el detalle, Catálogo muestra su 404. El favorito se puede quitar desde la card. |
| CB-07 | Media sin póster (`poster_path` null) | Card con el placeholder del Catálogo (ícono + título). |
| CB-08 | "Deshacer" después de quitar en *Mi perfil* | Se re-agrega el media y reaparece al principio. Si falla, toast de error. |
| CB-09 | Se quita el último favorito de un filtro | Aparece el estado vacío de ese filtro sin recargar. |
| CB-10 | Se agrega o quita un favorito mientras ya hay páginas cargadas | La lista local se actualiza de forma optimista. Las páginas siguientes se piden con un cursor estable (`created_at`, `id`) para no repetir ni saltear ítems. |
| CB-11 | Falla la carga de una página del scroll infinito | Las páginas ya cargadas quedan visibles y al final aparece "No pudimos cargar más · Reintentar". El sentinel no vuelve a disparar hasta reintentar. |
| CB-12 | Archivo de avatar de más de 5 MB | Se valida en el cliente antes de subir (mensaje inmediato). Si se saltea la validación, el servidor igual responde 413. |
| CB-13 | Archivo con extensión `.jpg` cuyo contenido no es una imagen | 415 "Formato no soportado. Usá JPG, PNG o WebP." |
| CB-14 | Imagen de menos de 128×128 px | 422 "La imagen debe medir al menos 128×128 px." |
| CB-15 | Supabase Storage no disponible al subir o quitar | 502 y toast "No pudimos guardar tu foto. Probá de nuevo en unos minutos." El avatar anterior queda intacto. |
| CB-16 | Falla el borrado del avatar anterior en el bucket | El usuario no lo nota. Queda un huérfano que borra el script de limpieza (8.4). |
| CB-17 | La URL del avatar no carga (bucket caído, objeto borrado) | Se usa el avatar de iniciales. |
| CB-18 | Búsqueda con menos de 2 caracteres (o solo `@`) | No se consulta. Texto de ayuda: "Escribí al menos 2 letras". |
| CB-19 | Búsqueda que empieza con `@` (`@jose`) | Se ignora el `@` y se busca `jose`. |
| CB-20 | Búsqueda con `%`, `_` o `\` | Se escapan para `ILIKE` y se buscan literalmente. El `_` es válido en usernames, así que `jose_` funciona. |
| CB-21 | Búsqueda sin resultados | Estado vacío "No encontramos usuarios para «texto»". |
| CB-22 | Las respuestas de búsqueda llegan fuera de orden | Solo se muestra la del último término (caché de RTK Query por argumento + debounce). |
| CB-23 | Búsqueda por email (`jm@mail.com`) | No encuentra por email. Puede coincidir con un username o nombre que contenga el texto sin `@` (por ejemplo `jm`). |
| CB-24 | `/u/:username` inexistente o con formato inválido | Pantalla 404 "Este usuario no existe" con un link a "Buscar usuarios". |
| CB-25 | `/u/JOSE_M` (con mayúsculas) | Redirección (`replace`) a `/u/jose_m`. |
| CB-26 | `/u/<mi username>` | Redirección (`replace`) a `/perfil`. |
| CB-27 | El otro usuario cambia su username mientras miro su perfil | La URL vieja da 404 en el siguiente request. No hay redirección desde usernames anteriores. |
| CB-28 | Se borra un usuario mientras otro ve su perfil | Los requests siguientes devuelven 404. Sus favoritos se borran en cascada; las filas de `media` quedan. |
| CB-29 | Usuario con miles de favoritos | Scroll infinito de a 20. `GET /me/favorites/ids` devuelve strings compactos (`"movie:603"`), aceptable hasta ~10.000 ítems. |
| CB-30 | Nombres con acentos ("José" vs "jose") | Coinciden gracias a `unaccent`. |

## 11. Consideraciones técnicas

- **Seguridad**
  - Ningún endpoint de este módulo devuelve `id`, `email`, `password_hash` ni `google_sub` (scope `public` + test de contrato contra el esquema zod `PublicProfile`).
  - El identificador público es el username.
  - Las imágenes se re-codifican siempre, lo que neutraliza payloads embebidos.
  - `SUPABASE_SERVICE_ROLE_KEY` solo en el server; se verifica en el build del client que no exista ninguna `VITE_SUPABASE_SERVICE_*`.
  - La CSP de `helmet` permite `img-src` desde el host de `SUPABASE_URL` y desde `image.tmdb.org`.
- **Dependencia con Catálogo:** `ensureMedia(tmdbId, mediaType)` es la única puerta de entrada a `media` desde este módulo. Tiene que ser idempotente, segura ante concurrencia (upsert sobre `(tmdb_id, media_type)`) y devolver la fila existente sin llamar a TMDB si está fresca. Si está vencida y TMDB falla, devuelve la fila vencida en vez de fallar.
- **Concurrencia:** el `PUT` de favorito usa `INSERT … ON CONFLICT (user_id, media_id) DO NOTHING RETURNING` y devuelve 201 o 200 según si insertó.
- **Rendimiento**
  - Los `counts` se calculan con un `GROUP BY media.media_type` sobre el JOIN indexado; no se guardan copias en `users`.
  - La paginación usa offset hasta la página 50 y, para listas más largas, un cursor `(created_at, id)`.
  - Conexión a Supabase por el pooler, con el tamaño del pool de Sequelize acorde al límite del plan.
- **Imágenes de TMDB:** el frontend arma `https://image.tmdb.org/t/p/w342{posterPath}` para cards y `w185` para mobile, con `srcset` y `loading="lazy"`.
- **Accesibilidad**
  - Foco visible.
  - `aria-live="polite"` para toasts, conteo de resultados y "cargando más".
  - El scroll infinito tiene un botón alternativo accesible para pedir la página siguiente con teclado.
  - El modal de avatar atrapa el foco y se cierra con `Esc`.
  - Contraste AA sobre fondo oscuro.
- **i18n:** textos de la UI en español rioplatense neutro y fechas con `Intl.DateTimeFormat('es')`.
- **Tests mínimos**
  - Unitarios del servicio de favoritos: idempotencia, unicidad y `ensureMedia` mockeado con 404 y 502.
  - Integración con Supertest: auth, 404, 413, 415, 422 y `AvatarStorage` en memoria.
  - Contrato zod de las respuestas públicas, sin campos privados.
  - Componentes: `FavoriteButton` optimista + rollback y grilla infinita con "Reintentar".
  - E2E: agregar → ver en el perfil → quitar → deshacer.

## 12. Criterios de aceptación (Gherkin)

```gherkin
# language: es
Característica: Gestión de favoritos
  Como usuario logueado de Vision Max
  Quiero marcar y desmarcar películas o series como favoritas
  Para tenerlas reunidas en mi perfil

  Antecedentes:
    Dado que inicié sesión como "Lucía Pérez" con username "lucia_p"

  Escenario: Agregar una película a favoritos desde una card
    Dado que estoy en la home y "Matrix" no está en mis favoritos
    Cuando toco el corazón de la card de "Matrix"
    Entonces el corazón se muestra relleno inmediatamente
    Y existe un favorito que apunta a la fila de "media" de la película 603
    Y "Matrix" aparece primera en la grilla de "Mi perfil"

  Escenario: Agregar un contenido que todavía no está en la tabla media
    Dado que la serie "Dark" no existe en la tabla "media"
    Cuando la agrego a favoritos desde su detalle
    Entonces el Catálogo crea la fila de "Dark" en "media" con datos de TMDB
    Y mi favorito apunta a esa fila
    Y el botón pasa a mostrar "En favoritos"

  Escenario: Agregar un contenido ya cacheado con TMDB caído
    Dado que "Matrix" ya existe en la tabla "media"
    Y TMDB no está disponible
    Cuando agrego "Matrix" a favoritos
    Entonces el favorito se crea correctamente

  Escenario: Quitar un favorito desde el catálogo
    Dado que "Matrix" está en mis favoritos
    Cuando toco el corazón relleno de la card de "Matrix"
    Entonces el corazón se muestra vacío inmediatamente
    Y "Matrix" ya no aparece en "Mi perfil"

  Escenario: Agregar dos veces el mismo contenido no duplica
    Dado que "Matrix" está en mis favoritos
    Cuando se envía otra solicitud para agregar "Matrix"
    Entonces la respuesta es exitosa
    Y "Matrix" figura una sola vez en mis favoritos

  Escenario: Película y serie con el mismo id de TMDB son distintas
    Dado que la película con id 1399 está en mis favoritos
    Cuando agrego la serie con id 1399
    Entonces tengo dos favoritos que apuntan a filas distintas de "media"

  Escenario: Falla del servidor revierte el cambio
    Dado que "Matrix" no está en mis favoritos
    Y el servidor no está disponible
    Cuando toco el corazón de la card de "Matrix"
    Entonces el corazón se rellena y luego vuelve a mostrarse vacío
    Y veo el aviso "No pudimos actualizar tus favoritos. Probá de nuevo."

  Escenario: Contenido inexistente en TMDB
    Dado que la película con id 999999999 no existe en "media" ni en TMDB
    Cuando se intenta agregarla a favoritos
    Entonces la respuesta es 404 con el código "MEDIA_NOT_FOUND"
    Y no se crea ningún favorito

  Escenario: Usuario anónimo intenta marcar un favorito
    Dado que no inicié sesión
    Y estoy en la página "/buscar?q=matrix"
    Cuando toco el corazón de la card de "Matrix"
    Entonces soy redirigido a "/ingresar?next=%2Fbuscar%3Fq%3Dmatrix"
    Y no se crea ningún favorito

Característica: Mi perfil
  Antecedentes:
    Dado que inicié sesión como "Lucía Pérez" con username "lucia_p"

  Escenario: Ver mis favoritos
    Dado que tengo 30 películas y 7 series en favoritos
    Cuando entro a "/perfil"
    Entonces veo mi avatar, "Lucía Pérez", "@lucia_p" y "Miembro desde"
    Y veo las pestañas "Todos 37", "Películas 30" y "Series 7"
    Y veo los 20 favoritos más recientes

  Escenario: Scroll infinito
    Dado que tengo 37 favoritos y estoy en "/perfil"
    Cuando llego al final de la grilla
    Entonces se cargan automáticamente los 17 favoritos restantes
    Y veo "No hay más favoritos"

  Escenario: Falla al cargar la página siguiente
    Dado que tengo 37 favoritos y estoy en "/perfil"
    Y el servidor falla al pedir la página 2
    Cuando llego al final de la grilla
    Entonces sigo viendo los primeros 20 favoritos
    Y veo "No pudimos cargar más" con el botón "Reintentar"
    Cuando toco "Reintentar" y el servidor responde
    Entonces se agregan los 17 favoritos restantes

  Esquema del escenario: Filtrar por tipo
    Dado que tengo películas y series en favoritos
    Cuando selecciono la pestaña "<pestaña>"
    Entonces solo veo favoritos de tipo "<tipo>" ordenados del más reciente al más antiguo

    Ejemplos:
      | pestaña   | tipo       |
      | Películas | movie      |
      | Series    | tv         |
      | Todos     | movie o tv |

  Escenario: Perfil sin favoritos
    Dado que no tengo favoritos
    Cuando entro a "/perfil"
    Entonces veo "Todavía no tenés favoritos"
    Y veo el botón "Explorar películas y series" que lleva a la home

  Escenario: Quitar desde mi perfil y deshacer
    Dado que "Matrix" está en mis favoritos
    Y estoy en "/perfil"
    Cuando toco el corazón de "Matrix"
    Entonces la card desaparece con una animación
    Y veo el aviso "Quitado de favoritos" con la acción "Deshacer"
    Cuando toco "Deshacer" antes de 5 segundos
    Entonces "Matrix" vuelve a aparecer al principio de mi grilla

  Escenario: Error al cargar mis favoritos
    Dado que el servidor no está disponible
    Cuando entro a "/perfil"
    Entonces veo "No pudimos cargar tus favoritos" y el botón "Reintentar"

Característica: Imagen de perfil
  Antecedentes:
    Dado que inicié sesión y estoy en "/perfil"

  Escenario: Subir un avatar válido
    Cuando toco "Cambiar foto"
    Y elijo un archivo PNG de 2 MB y 1200x800 px
    Y ajusto el recorte cuadrado
    Y toco "Guardar"
    Entonces veo mi nueva foto en el perfil y en el header
    Y el bucket "avatars" de Supabase Storage contiene las versiones WebP de 512x512 y 128x128 sin metadatos EXIF
    Y la URL pública del avatar no contiene mi id interno

  Esquema del escenario: Archivo de avatar inválido
    Cuando intento subir "<archivo>"
    Entonces veo el error "<mensaje>"
    Y mi avatar no cambia

    Ejemplos:
      | archivo               | mensaje                                    |
      | foto.jpg de 8 MB      | La imagen supera los 5 MB.                 |
      | animacion.gif         | Formato no soportado. Usá JPG, PNG o WebP. |
      | falso.jpg (es un PDF) | Formato no soportado. Usá JPG, PNG o WebP. |
      | mini.png de 64x64 px  | La imagen debe medir al menos 128×128 px.  |

  Escenario: Reemplazar el avatar borra el anterior
    Dado que ya tengo un avatar
    Cuando subo una imagen nueva válida
    Entonces se muestra la nueva con una URL distinta a la anterior
    Y los objetos del avatar anterior se eliminan del bucket "avatars"

  Escenario: Supabase Storage no disponible
    Dado que ya tengo un avatar
    Y Supabase Storage no responde
    Cuando subo una imagen nueva válida
    Entonces veo "No pudimos guardar tu foto. Probá de nuevo en unos minutos."
    Y sigo viendo mi avatar anterior

  Escenario: Eliminar el avatar
    Dado que tengo un avatar
    Cuando toco "Cambiar foto" y luego "Quitar foto"
    Y confirmo
    Entonces veo un avatar con mis iniciales "LP"

Característica: Búsqueda de usuarios
  Antecedentes:
    Dado que inicié sesión como "Lucía Pérez" con username "lucia_p"
    Y existen los usuarios:
      | nombre  | apellido | username   |
      | José    | Martínez | jose_m     |
      | Josefina| Ruiz     | jruiz      |
      | Ana     | Josa     | ana_jose   |
      | Pedro   | Sosa     | josephfan  |

  Escenario: Buscar por nombre sin acentos
    Cuando escribo "jose" en "/usuarios"
    Entonces veo en este orden a "José Martínez", "Josefina Ruiz", "Pedro Sosa" y "Ana Josa"
    Y "Ana Josa" aparece última porque su coincidencia ("ana_jose") no está al inicio de ningún campo
    Y cada resultado muestra su username como "@handle"

  Escenario: Buscar por username con arroba
    Cuando escribo "@jruiz"
    Entonces veo primero a "Josefina Ruiz" con "@jruiz"

  Escenario: Buscar por nombre y apellido
    Cuando escribo "jose mart"
    Entonces veo solo a "José Martínez"

  Escenario: Término demasiado corto
    Cuando escribo "j"
    Entonces no se realiza ninguna búsqueda
    Y veo "Escribí al menos 2 letras"

  Escenario: Sin resultados
    Cuando escribo "zzzz"
    Entonces veo "No encontramos usuarios para «zzzz»"

  Escenario: No me encuentro a mí misma
    Cuando escribo "lucia"
    Entonces no aparezco en los resultados

  Escenario: No se busca por email
    Dado que "José Martínez" tiene el email "contacto@vision.dev"
    Cuando escribo "contacto@vision"
    Entonces no veo resultados

  Escenario: Resultados con scroll infinito
    Dado que hay 45 usuarios cuyo apellido contiene "garcia"
    Cuando escribo "garcia"
    Entonces veo 20 resultados
    Cuando llego al final de la lista
    Entonces se cargan 20 resultados más

  Escenario: Búsqueda sin sesión
    Dado que no inicié sesión
    Cuando abro "/usuarios"
    Entonces soy redirigido al login

Característica: Perfil de otro usuario
  Antecedentes:
    Dado que inicié sesión como "Lucía Pérez" con username "lucia_p"

  Escenario: Ver el perfil de otro usuario
    Dado que "José Martínez" (username "jose_m") tiene 5 películas favoritas
    Cuando abro su perfil desde los resultados de búsqueda
    Entonces la URL es "/u/jose_m"
    Y veo su avatar, "José Martínez", "@jose_m", "Miembro desde" y sus 5 películas
    Y no veo su email ni su id interno en la pantalla ni en la respuesta de la API

  Escenario: Agregar a mis favoritos algo del perfil ajeno
    Dado que estoy en "/u/jose_m"
    Y "Dune" está en sus favoritos pero no en los míos
    Cuando toco el corazón de "Dune"
    Entonces "Dune" se agrega a mis favoritos
    Y los favoritos de José no cambian

  Escenario: Otro usuario sin favoritos
    Dado que "Ana Josa" no tiene favoritos
    Cuando abro "/u/ana_jose"
    Entonces veo "Ana todavía no agregó favoritos"

  Esquema del escenario: Username inexistente o inválido
    Cuando abro "<url>"
    Entonces veo "Este usuario no existe"
    Y veo el link "Buscar usuarios"

    Ejemplos:
      | url               |
      | /u/no_existe_123  |
      | /u/ab             |
      | /u/con-guiones    |

  Escenario: URL con mayúsculas
    Cuando abro "/u/JOSE_M"
    Entonces la URL se reemplaza por "/u/jose_m"
    Y veo el perfil de "José Martínez"

  Escenario: Abrir mi propio perfil por URL pública
    Cuando abro "/u/lucia_p"
    Entonces soy redirigida a "/perfil"

  Escenario: Perfil ajeno sin sesión
    Dado que no inicié sesión
    Cuando abro "/u/jose_m"
    Entonces soy redirigido a "/ingresar?next=%2Fu%2Fjose_m"
```

## 13. Mockups ASCII

### 13.1 Botón de favorito en card (estados)

```
 No favorito          Favorito             Pendiente (optimista)   Anónimo
┌──────────────┐    ┌──────────────┐     ┌──────────────┐        ┌──────────────┐
│          (♡) │    │          (♥) │     │          (♥) │        │          (♡) │
│              │    │              │     │   (pulso)    │        │  tap → login │
│   PÓSTER     │    │   PÓSTER     │     │   PÓSTER     │        │   PÓSTER     │
│              │    │              │     │              │        │              │
├──────────────┤    ├──────────────┤     ├──────────────┤        ├──────────────┤
│ Matrix       │    │ Matrix       │     │ Matrix       │        │ Matrix       │
│ 1999 · ★ 8.2 │    │ 1999 · ★ 8.2 │     │ 1999 · ★ 8.2 │        │ 1999 · ★ 8.2 │
└──────────────┘    └──────────────┘     └──────────────┘        └──────────────┘
 ♡ contorno           ♥ relleno acento     sin bloqueo visual
```

### 13.2 Botón de favorito en detalle (desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VISION MAX     Inicio  Películas  Series      [ Buscar…        ]   (LP) ▾   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░ backdrop oscurecido ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ┌──────────┐                                                                │
│  │          │   Dark                                                         │
│  │  PÓSTER  │   2017 · Serie · ★ 8.4 · Drama, Misterio                       │
│  │          │                                                                │
│  │          │   [ ♡ Agregar a favoritos ]   [ ▶ Tráiler ]                    │
│  └──────────┘                                                                │
│                 (tras tocar)  [ ♥ En favoritos ]                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 13.3 Mi perfil (desktop, scroll infinito)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VISION MAX     Inicio  Películas  Series      [ Buscar…        ]   (LP) ▾   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒ banda con backdrops recientes desenfocados ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
│   ╭──────╮                                                                   │
│   │ FOTO │  Lucía Pérez                                                      │
│   │      │  @lucia_p · Miembro desde marzo 2026                              │
│   ╰──────╯  [ ✎ Cambiar foto ]          30 películas · 7 series              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Mis favoritos                                                               │
│  ( Todos 37 )  ( Películas 30 )  ( Series 7 )                                │
│                                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│                       │
│  │      │ │      │ │      │ │      │ │      │ │      │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                       │
│  Matrix   Dark     Dune     Severance Up      Fargo                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│ │   (♥)│                       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                       │
│  ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐  ← skeletons: cargando │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    la página siguiente │
│                                                                              │
│  ┌──────────────────────────────────────┐                                    │
│  │ Quitado de favoritos     [Deshacer]  │  ← toast 5 s tras quitar           │
│  └──────────────────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Final de la grilla: falla de página y fin de lista.
```
 Falla al cargar más                         Fin de la lista
┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
│  … últimas cards cargadas …            │  │  … últimas cards cargadas …            │
│                                        │  │                                        │
│  ⚠ No pudimos cargar más.              │  │        ── No hay más favoritos ──      │
│            [ Reintentar ]              │  │                                        │
└────────────────────────────────────────┘  └────────────────────────────────────────┘
```

### 13.4 Editar avatar (modal)

Paso 1: selección.
```
┌────────────────────────────────────────────┐
│  Foto de perfil                        [✕] │
├────────────────────────────────────────────┤
│   ┌────────────────────────────────────┐   │
│   │                                    │   │
│   │      Arrastrá una imagen acá       │   │
│   │      o  [ Elegir archivo ]         │   │
│   │                                    │   │
│   │   JPG, PNG o WebP · máx. 5 MB      │   │
│   │   mínimo 128×128 px                │   │
│   └────────────────────────────────────┘   │
│                                            │
│   [ Quitar foto actual ]                   │
└────────────────────────────────────────────┘
```

Paso 2: recorte.
```
┌────────────────────────────────────────────┐
│  Ajustá tu foto                        [✕] │
├────────────────────────────────────────────┤
│   ┌────────────────────────────────────┐   │
│   │░░░░░░░┌──────────────────┐░░░░░░░░░│   │
│   │░░░░░░░│                  │░░░░░░░░░│   │
│   │░░░░░░░│   área cuadrada  │░░░░░░░░░│   │   Vista previa
│   │░░░░░░░│   (arrastrable)  │░░░░░░░░░│   │      ╭────╮
│   │░░░░░░░└──────────────────┘░░░░░░░░░│   │      │    │
│   └────────────────────────────────────┘   │      ╰────╯
│   Zoom  −  ●━━━━━━━━━○━━━━━━━  +           │
│                                            │
│            [ Cancelar ]   [ Guardar ]      │
└────────────────────────────────────────────┘
```

Estados: subiendo y error.
```
┌────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│  Foto de perfil                        [✕] │   │  Foto de perfil                        [✕] │
├────────────────────────────────────────────┤   ├────────────────────────────────────────────┤
│          ╭────╮                            │   │   ┌────────────────────────────────────┐   │
│          │    │  Guardando…                │   │   │      o  [ Elegir archivo ]         │   │
│          ╰────╯  [▓▓▓▓▓▓░░░░]              │   │   └────────────────────────────────────┘   │
│                                            │   │   ⚠ La imagen supera los 5 MB.             │
│            [ Cancelar ]   [ ··· ]          │   │   ⚠ No pudimos guardar tu foto. Probá de   │
│                                            │   │     nuevo en unos minutos. (Storage caído) │
└────────────────────────────────────────────┘   └────────────────────────────────────────────┘
```

### 13.5 Búsqueda de usuarios (desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VISION MAX     Inicio  Películas  Series      [ Buscar…        ]   (LP) ▾   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Buscar usuarios                                                             │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │ 🔍  jose                                                 [✕] │            │
│  └──────────────────────────────────────────────────────────────┘            │
│  Buscá por @usuario, nombre o apellido · 4 resultados                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ (JM)  José Martínez                       12 películas · 4 series   ›  │  │
│  │       @jose_m                                                          │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ (JR)  Josefina Ruiz                        3 películas · 0 series   ›  │  │
│  │       @jruiz                                                           │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ (PS)  Pedro Sosa                           8 películas · 2 series   ›  │  │
│  │       @josephfan                                                       │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ (AJ)  Ana Josa                             0 películas · 1 serie    ›  │  │
│  │       @ana_jose                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│   ( ) ▄▄▄▄▄▄▄▄▄   ← skeleton si hay más páginas (scroll infinito)            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Estados de la búsqueda:
```
 Inicial / < 2 letras            Cargando                    Sin resultados
┌────────────────────────┐    ┌────────────────────────┐   ┌──────────────────────────┐
│ 🔍 j                   │    │ 🔍 jose                │   │ 🔍 zzzz                  │
│                        │    │ ( ) ▄▄▄▄▄▄▄▄▄          │   │                          │
│ Escribí al menos       │    │ ( ) ▄▄▄▄▄▄▄            │   │ No encontramos usuarios  │
│ 2 letras para buscar   │    │ ( ) ▄▄▄▄▄▄▄▄▄▄         │   │ para «zzzz»              │
│ por @usuario, nombre   │    │   (skeletons)          │   │                          │
│ o apellido.            │    │                        │   │                          │
└────────────────────────┘    └────────────────────────┘   └──────────────────────────┘

 Falla al cargar más resultados
┌──────────────────────────────────────────┐
│ … resultados ya cargados …               │
│ ⚠ No pudimos cargar más.  [ Reintentar ] │
└──────────────────────────────────────────┘
```

### 13.6 Perfil de otro usuario (desktop, `/u/jose_m`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VISION MAX     Inicio  Películas  Series      [ Buscar…        ]   (LP) ▾   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ← Volver                                                                     │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ banda con sus backdrops recientes ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
│   ╭──────╮                                                                   │
│   │ FOTO │  José Martínez                                                    │
│   ╰──────╯  @jose_m · Miembro desde enero 2026    12 películas · 4 series    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Favoritos de José                                                           │
│  ( Todos 16 )  ( Películas 12 )  ( Series 4 )                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │   (♥)│ │   (♡)│ │   (♡)│ │   (♥)│ │   (♡)│ │   (♡)│  ← corazón = MIS fav. │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                       │
│  Matrix   Dune     Alien    Dark      Heat     Ozark                         │
│  ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄┐ …  (scroll infinito)                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 13.7 Estados vacío y error

```
 Mi perfil sin favoritos              Otro usuario sin favoritos
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│              ♡                   │ │              ♡                   │
│  Todavía no tenés favoritos      │ │  Ana todavía no agregó           │
│  Tocá el corazón en cualquier    │ │  favoritos.                      │
│  película o serie para guardarla.│ │                                  │
│  [ Explorar películas y series ] │ │  [ Buscar otros usuarios ]       │
└──────────────────────────────────┘ └──────────────────────────────────┘

 Error de carga inicial               Usuario inexistente (404)
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│              ⚠                   │ │              ?                   │
│  No pudimos cargar tus favoritos │ │  Este usuario no existe          │
│  Revisá tu conexión.             │ │  Puede que el @usuario esté mal  │
│        [ Reintentar ]            │ │  escrito o que la cuenta ya no   │
│                                  │ │  exista.                         │
│                                  │ │  [ Buscar usuarios ]             │
└──────────────────────────────────┘ └──────────────────────────────────┘

 Toast de error (rollback de favorito)
┌───────────────────────────────────────────────────────┐
│ ⚠ No pudimos actualizar tus favoritos. Probá de nuevo. │
└───────────────────────────────────────────────────────┘
```

### 13.8 Mobile (≈ 375 px)

```
 Mi perfil                    Buscar usuarios              Perfil ajeno
┌─────────────────────┐     ┌─────────────────────┐      ┌─────────────────────┐
│ ☰  VISION MAX  (LP) │     │ ←  Buscar usuarios  │      │ ←                   │
├─────────────────────┤     ├─────────────────────┤      ├─────────────────────┤
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │     │┌───────────────────┐│      │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
│      ╭──────╮       │     ││🔍 jose         [✕]││      │      ╭──────╮       │
│      │ FOTO │✎      │     │└───────────────────┘│      │      │ FOTO │       │
│      ╰──────╯       │     │ 4 resultados        │      │      ╰──────╯       │
│    Lucía Pérez      │     │┌───────────────────┐│      │   José Martínez     │
│      @lucia_p       │     ││(JM) José Martínez ││      │      @jose_m        │
│ Miembro desde 03/26 │     ││ @jose_m          ›││      │ Miembro desde 01/26 │
│ 30 pelis · 7 series │     ││ 12 pel · 4 ser    ││      │ 12 pel · 4 series   │
├─────────────────────┤     │├───────────────────┤│      ├─────────────────────┤
│(Todos)(Pelis)(Series)│    ││(JR) Josefina Ruiz ││      │(Todos)(Pelis)(Series)│
│ ┌───────┐ ┌───────┐ │     ││ @jruiz           ›││      │ ┌───────┐ ┌───────┐ │
│ │    (♥)│ │    (♥)│ │     ││ 3 pel · 0 ser     ││      │ │    (♥)│ │    (♡)│ │
│ │       │ │       │ │     │├───────────────────┤│      │ │       │ │       │ │
│ └───────┘ └───────┘ │     ││(PS) Pedro Sosa    ││      │ └───────┘ └───────┘ │
│ Matrix    Dark      │     ││ @josephfan       ›││      │ Matrix    Dune      │
│ ┌───────┐ ┌───────┐ │     │├───────────────────┤│      │ ┌───────┐ ┌───────┐ │
│ │    (♥)│ │    (♥)│ │     ││(AJ) Ana Josa      ││      │ │    (♡)│ │    (♥)│ │
│ └───────┘ └───────┘ │     ││ @ana_jose        ›││      │ └───────┘ └───────┘ │
│ ┌▄▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄▄┐ │     │└───────────────────┘│      │ ┌▄▄▄▄▄▄▄┐ ┌▄▄▄▄▄▄▄┐ │
│  (cargando más…)    │     │                     │      │  (cargando más…)    │
└─────────────────────┘     └─────────────────────┘      └─────────────────────┘
 Grilla de 2 columnas, scroll infinito con skeletons y "Reintentar" si falla.
 El corazón tiene un área táctil de 44×44 px. El modal de avatar se abre como
 bottom sheet a pantalla completa.
```

## 14. Asunciones validadas

| # | Asunción original | Decisión validada | Resultado |
|---|---|---|---|
| F1 | `Favorite` guarda una copia mínima de datos de TMDB | `Favorite (user_id, media_id → media, created_at)`. La tabla `media` es del Catálogo y se completa con `ensureMedia` (upsert). El listado hace JOIN a `media` | **Cambió** |
| F2 | Avatares en el disco local del backend | Supabase Storage, bucket público `avatars`, escritura con `SUPABASE_SERVICE_ROLE_KEY`. Se mantienen WebP de 512/128 y `avatar_key` versionada | **Cambió** |
| F3 | Perfiles públicos solo con login, sin privacidad | Confirmado: perfiles y búsqueda solo con login, sin opción de privacidad | Se mantiene |
| F4 | URL `/usuarios/:id` con el id interno | `/u/:username` (username de Auth: `[a-z0-9_]`, de 3 a 20 caracteres). Los endpoints públicos usan username | **Cambió** |
| F5 | Ids favoritos cargados al iniciar sesión y guardados en Redux | Confirmado | Se mantiene |
| F6 | Búsqueda por nombre y apellido, sin email, excluye al propio usuario | Búsqueda parcial, sin acentos ni mayúsculas, por **username**, nombre o apellido. Sin email. Excluye al propio usuario | **Cambió** |
| F7 | Actualización optimista + rollback + "Deshacer" | Confirmado | Se mantiene |
| F8 | Avatar JPG/PNG/WebP, máx. 5 MB, mín. 128×128, recorte en el cliente | Confirmado | Se mantiene |
| F9 | En perfiles ajenos, el corazón refleja mis favoritos | Confirmado | Se mantiene |
| F10 | Paginación de a 20 con "Cargar más" | Scroll infinito de a 20 con "Reintentar" si falla. Se mantienen el orden por más reciente y las pestañas por tipo con contadores | **Cambió** |

Cambios transversales incorporados desde `00-decisiones.md`: nombre **Vision Max**, monorepo TypeScript con npm workspaces (`apps/client`, `apps/server`, `packages/shared`), Supabase Postgres como base de datos y `@handle` visible en las cards de usuario y en las cabeceras de perfil.
