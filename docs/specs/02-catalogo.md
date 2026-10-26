# 02 — Catálogo y Búsqueda

> **Estado:** FINAL — asunciones validadas por el usuario el 2026-10-26.
> Producto: **Vision Max**. Fuente de verdad transversal: [`00-decisiones.md`](./00-decisiones.md);
> si algo de esta spec la contradijera, gana ese archivo.
> Las marcas `[Cn]` remiten a la decisión *Cn* del módulo Catálogo (sección 10 y `00-decisiones.md`).

## 1. Historia de usuario

> Como usuario quiero ver un Home con películas y series trending y upcoming, buscar
> películas o series, ver los resultados en una grilla, filtrarlos por año y ver el
> detalle de una película o serie, para descubrir qué ver.

### Alcance

| Incluido en este módulo | Fuera de alcance (otros módulos) |
|---|---|
| Home (tendencias + próximos estrenos) | Registro, login, tokens, sesión (módulo **01 Auth**) |
| Búsqueda de películas y series | Lógica de favoritos, listas, perfiles (módulo **03 Favoritos/Perfiles**) |
| Grilla de resultados + filtro por año | Calificar / reseñar contenido |
| Detalle de película y de serie | Detalle de episodio, persona (actor) o colección |
| Estados de carga, vacío, error; versión mobile | Panel de administración |
| Proxy backend a TMDB + caché persistente en Postgres (Supabase) | Importación masiva o sincronización completa del catálogo de TMDB |
| Tabla compartida `media` (dueño: este módulo) y servicio `ensureMedia` | Tabla `favorites` y su lógica (módulo **03**) |
| Migraciones y limpieza de las tablas del catálogo | |

El **botón de favorito** aparece en tarjetas y en el detalle, pero su estado, su acción
y la redirección a login cuando no hay sesión son responsabilidad del módulo 03 (y 01).
Este módulo solo reserva el espacio y expone `mediaType` + `tmdbId` al componente.

**Contrato con Favoritos (03):** la tabla `media` pertenece a Catálogo. Favoritos la
referencia por FK (`favorites.media_id → media.id`) y **nunca escribe en ella
directamente**: para dar de alta un ítem usa el servicio `ensureMedia(tmdbId, mediaType)`
(sección 6.3).

### Ubicación en el monorepo

| Workspace | Contenido de este módulo |
|---|---|
| `packages/shared` | Esquemas zod de parámetros (`catalogQuerySchemas`) y DTO (`MediaSummary`, `MovieDetail`, etc., como `z.infer`), constantes (`MEDIA_TYPES`, `YEAR_MIN`, `CATALOG_SCHEMA_VERSION`) |
| `apps/server` | Módulo `catalog`: rutas `/api/catalog`, cliente TMDB, repositorios de caché, modelos Sequelize `Media` y `CatalogCache`, migraciones, job de limpieza, servicio `ensureMedia` |
| `apps/client` | `catalogApi` (RTK Query), páginas Home / Buscar / Explorar / Detalle, componentes de grilla y tarjetas reutilizados por el módulo 03 |

## 2. Glosario

- **Media**: una película (`movie`) o una serie (`tv`), identificada por `(mediaType, tmdbId)`.
- **Tarjeta**: representación compacta de un media (póster 2:3, título, año, puntaje).
- **Carrusel**: fila horizontal desplazable de tarjetas en el Home.
- **Trending**: lo más popular en TMDB en una ventana temporal (día/semana).
- **Upcoming / Próximamente**: estrenos con fecha futura.
- **Entrada de caché**: respuesta normalizada de TMDB guardada en Postgres con `fetched_at`
  y `expires_at`.
- **Fresca / vencida / expirada**: *fresca* si `now < expires_at`; *vencida* si ya pasó
  `expires_at` pero sigue dentro de la ventana de revalidación (`stale_until`); *expirada*
  si pasó también `stale_until`.

## 3. Reglas de negocio

### 3.1 Acceso
- RN-01. Home, búsqueda y detalle son **públicos**: no requieren sesión. `[C6]`
- RN-02. El botón de favorito se muestra siempre; si no hay sesión, el módulo 03/01 decide
  el comportamiento (se asume redirección a login con retorno a la URL actual). `[C6]`

### 3.2 Idioma y región
- RN-03. Todas las consultas a TMDB usan `language=es-ES` y, donde aplica,
  `region=AR` (fechas de estreno y "próximamente" según Argentina). `[C8]`
- RN-04. Si la sinopsis en español está vacía, el backend la completa con la de `en-US`
  y la marca con `overviewLang: "en"`; la UI muestra la etiqueta "Sinopsis en inglés". `[C8]`
- RN-05. Títulos: se muestra el título localizado; si difiere del original, el detalle
  muestra también el título original en tipografía secundaria.

### 3.3 Home
- RN-06. El Home tiene, en este orden: `[C9]`
  1. **Hero**: el primer ítem de "Tendencias" (película o serie) con backdrop, título,
     año, puntaje, sinopsis truncada a 3 líneas y botón "Ver detalle".
  2. Carrusel **"Tendencias"** con selector **Hoy / Esta semana** (por defecto *Esta semana*)
     y selector **Películas / Series** (por defecto *Películas*).
  3. Carrusel **"Próximamente en cines"** (películas upcoming).
  4. Carrusel **"Series que se vienen"** (series próximas, ver RN-08). `[C4]`
- RN-07. Cada carrusel muestra hasta 20 ítems (página 1 de TMDB) y un enlace "Ver todo"
  que abre la grilla correspondiente (`/explorar/tendencias/pelicula`, etc.) con scroll
  infinito, igual que todas las grillas de la app. `[C3]`
- RN-08. "Upcoming" de series: TMDB no tiene endpoint `/tv/upcoming`; se define como
  series cuyo `first_air_date` está entre **hoy y hoy + 90 días**, ordenadas por
  popularidad descendente (vía `/discover/tv`). `[C4]`
- RN-09. Upcoming de películas: `/movie/upcoming` con `region=AR`, y el backend **descarta**
  ítems con `release_date < hoy` (TMDB incluye estrenos recientes en ese endpoint). Ese
  filtro se aplica **al servir** la respuesta, no solo al guardarla, para que una entrada
  de caché de ayer no muestre estrenos que ya pasaron.

### 3.4 Búsqueda
- RN-10. La búsqueda es **por tipo**: la página de resultados tiene pestañas
  **Películas | Series**; cada pestaña consulta su propio endpoint
  (`/search/movie` o `/search/tv`). Cada pestaña muestra su total de resultados. `[C2]`
- RN-11. La pestaña activa por defecto es **Películas**, salvo que tenga 0 resultados y
  Series tenga más de 0; en ese caso se activa Series automáticamente. `[C2]`
- RN-12. La búsqueda se dispara **mientras se escribe** con debounce de **400 ms**
  a partir de **2 caracteres**, y también al presionar Enter. `[C10]`
- RN-13. El término se normaliza: `trim`, colapso de espacios múltiples; máximo
  **100 caracteres** (el input no permite más).
- RN-14. Se excluye contenido adulto (`include_adult=false`) en búsquedas y listados.
- RN-15. El estado de búsqueda vive en la URL: `/buscar?q=<término>&tipo=pelicula|serie&anio=<YYYY>`.
  Recargar o compartir la URL reproduce exactamente los resultados.
- RN-16. Orden de resultados: el que devuelve TMDB (relevancia). No hay selector de orden.

### 3.5 Grilla y paginación
- RN-17. Los resultados se muestran en una **grilla de tarjetas** (póster 2:3):
  2 columnas en mobile (<640 px), 3 en `sm`, 4 en `md`, 5 en `lg`, 6 en `xl`.
- RN-18. Paginación por **scroll infinito**: al acercarse al final (sentinela a 600 px del
  borde) se pide la página siguiente (20 ítems por página, tamaño fijo de TMDB). `[C3]`
  Es el patrón de **todas** las grillas de Vision Max (búsqueda, explorar, mis favoritos,
  perfiles ajenos): este módulo provee `MediaGrid` y el hook de scroll infinito, y el
  módulo 03 los reutiliza.
- RN-19. Límite de TMDB: máximo **500 páginas**; el backend reporta
  `totalPages = min(total_pages, 500)`. Al llegar a la última página se muestra
  "No hay más resultados".
- RN-20. Al agregar páginas se **deduplica** por `(mediaType, tmdbId)` (TMDB a veces repite ítems entre páginas).
- RN-21. Si falla la carga de una página > 1, los ítems ya cargados permanecen y aparece
  un botón "Reintentar" al final de la grilla.

### 3.6 Filtro por año
- RN-22. El filtro es un **año único** (selector desplegable), opcional; valor por defecto
  "Todos los años". `[C7]`
- RN-23. Rango permitido: desde **1900** hasta **año actual + 2**, en orden descendente. `[C7]`
- RN-24. El filtro se aplica **en TMDB** (no en el cliente): `primary_release_year` para
  películas, `first_air_date_year` para series. Cambiar el año reinicia a página 1. `[C7]`
- RN-25. El filtro se conserva al cambiar de pestaña Películas/Series y al cambiar el término.
- RN-26. Un año fuera de rango en la URL se ignora (se muestra "Todos los años") sin error.
- RN-27. El filtro por año también está disponible en las grillas "Ver todo" de
  Próximamente; **no** en Tendencias (TMDB no lo soporta en `/trending`).

### 3.7 Detalle de película `[C5]`
- RN-28. Muestra: backdrop, póster, título (y original si difiere), año, clasificación por
  edad para AR (de `release_dates`, si existe), duración (`2 h 14 min`), géneros, puntaje
  (0–10 con un decimal) y cantidad de votos, tagline, sinopsis, director(es),
  guionista(s), reparto principal (hasta 12 con foto y personaje), tráiler (YouTube),
  fecha de estreno, estado, presupuesto y recaudación (si > 0),
  y carrusel "Recomendadas" (hasta 12).
- RN-29. El tráiler se elige así: video de YouTube tipo `Trailer`, preferir `es` y luego
  `en`, preferir `official=true`, luego el más reciente. Si no hay, no se muestra el botón.
  El tráiler se reproduce en un modal (embed `youtube-nocookie.com`).
- RN-30. Si no hay recomendaciones, se usan "Similares"; si tampoco, se oculta la sección.

### 3.8 Detalle de serie `[C5]`
- RN-31. Muestra: backdrop, póster, nombre (y original si difiere), años de emisión
  (`2019–2023` o `2021–` si sigue en emisión), clasificación por edad AR (de
  `content_ratings`), duración típica de episodio, géneros, puntaje y votos, tagline,
  sinopsis, creadores, cadenas/plataformas (`networks`, con logo), estado traducido
  (En emisión, Finalizada, Cancelada, En producción, Planeada), cantidad de temporadas
  y episodios, próximo episodio (si existe: número, nombre, fecha), reparto principal
  (hasta 12), tráiler, y carrusel "Recomendadas".
- RN-32. Lista de temporadas: tarjetas con póster, nombre, año, cantidad de episodios.
  La temporada 0 ("Especiales") se muestra al final. **No** hay detalle de episodios
  (fuera de alcance).

### 3.9 Datos visuales
- RN-33. Imágenes servidas directamente desde el CDN de TMDB (`https://image.tmdb.org/t/p/{size}{path}`),
  que no requiere API key. Tamaños: póster en grilla `w342`, póster detalle `w500`,
  backdrop `w1280` (mobile `w780`), fotos de reparto `w185`, logos `w92`.
- RN-34. Sin póster → placeholder con el título sobre fondo neutro y un ícono de película/TV.
  Sin backdrop → degradado oscuro.
- RN-35. Puntaje con 0 votos → "Sin calificación". Fecha vacía → "Fecha por confirmar".
- RN-36. Atribución obligatoria de TMDB en el footer: logo de TMDB + texto
  "Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB".

## 4. Rutas del frontend

| Ruta | Pantalla |
|---|---|
| `/` | Home |
| `/buscar?q=&tipo=pelicula\|serie&anio=` | Resultados de búsqueda |
| `/explorar/tendencias/:tipo?ventana=dia\|semana` | Grilla "Ver todo" de tendencias |
| `/explorar/proximamente/:tipo?anio=` | Grilla "Ver todo" de próximos estrenos |
| `/pelicula/:id` (acepta `/pelicula/:id-slug`) | Detalle de película |
| `/serie/:id` (acepta `/serie/:id-slug`) | Detalle de serie |
| `*` | 404 "No encontramos esta página" |

`:tipo` ∈ {`pelicula`, `serie`}. Un `:id` no numérico redirige a la 404.

## 5. API propia (backend Express, proxy a TMDB) `[C1]`

Prefijo: `/api/catalog`. Todas las respuestas en JSON. Ninguna requiere autenticación.
La API key de TMDB (`TMDB_API_TOKEN`, token v4 de lectura) solo vive en el backend.
Cada respuesta pasa primero por la caché persistente en Postgres (sección 6.2); la
columna "Almacenamiento" indica dónde queda guardada.

| Método y ruta | Parámetros | TMDB usado | Almacenamiento (`kind`) |
|---|---|---|---|
| `GET /api/catalog/home` | — | Compone 4 entradas: trending movie/week p1, trending tv/week p1, upcoming movie p1, discover tv p1 | `catalog_cache` (cada lista por separado) |
| `GET /api/catalog/trending/:type` | `window=day\|week`, `page` | `/trending/{movie\|tv}/{day\|week}` | `catalog_cache` (`trending`) |
| `GET /api/catalog/upcoming/:type` | `page`, `year?` | `/movie/upcoming` (`upcoming`) · `/discover/tv` (`discover`, RN-08) | `catalog_cache` |
| `GET /api/catalog/search` | `q`, `type=movie\|tv`, `year?`, `page` | `/search/movie` · `/search/tv` | `catalog_cache` (`search`) |
| `GET /api/catalog/movie/:id` | — | `/movie/{id}?append_to_response=credits,videos,recommendations,similar,release_dates` | `media.detail` |
| `GET /api/catalog/tv/:id` | — | `/tv/{id}?append_to_response=credits,videos,recommendations,similar,content_ratings` | `media.detail` |

Los tiempos de vida por endpoint están en la tabla de la sección 6.2.4.

`/home` devuelve en una sola respuesta las 4 listas (página 1) para evitar 4 round-trips.
Cada lista se resuelve por separado: si una falla y no hay nada en la DB, esa sección llega
en `null` y su nombre aparece en `failedSections`. Las demás se devuelven igual (respuesta `200`).
Las variantes "Hoy" del selector de tendencias se piden a `/trending/:type?window=day`.

Headers de respuesta comunes:
- `X-Cache: MEMORY | HIT | STALE | MISS | STALE-ERROR` (ver 6.2.5).
- `Cache-Control: public, max-age=<segundos hasta expires_at>, stale-while-revalidate=<segundos hasta stale_until>`;
  en `STALE-ERROR`, `max-age=0`.

`/search` además devuelve `counts: { movie, tv }` (total de cada tipo) para las pestañas;
el backend consulta ambos endpoints de TMDB en paralelo para la página 1 y solo el del
tipo activo para páginas > 1.

### 5.1 Contratos (DTO)

Viven en `packages/shared` como esquemas zod, y los tipos se obtienen con `z.infer`. El
backend valida con ellos la salida que normaliza desde TMDB antes de guardarla y de
responderla. El cliente los usa para tipar `catalogApi`. Los parámetros de entrada
(sección 5.2) también son esquemas zod compartidos, así el frontend valida la URL con las
mismas reglas que el backend.

```ts
type MediaType = 'movie' | 'tv';

interface MediaSummary {
  tmdbId: number;
  mediaType: MediaType;
  title: string;            // title (movie) | name (tv)
  originalTitle: string;
  year: number | null;      // de release_date | first_air_date
  date: string | null;      // ISO YYYY-MM-DD
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;    // null si voteCount === 0
  voteCount: number;
  overview: string;
  overviewLang: 'es' | 'en' | null;
}

interface Paged<T> {
  page: number;
  totalPages: number;       // máx. 500
  totalResults: number;
  results: T[];
}

interface SearchResponse extends Paged<MediaSummary> {
  counts: { movie: number; tv: number };
}

type HomeSection = 'trendingMovies' | 'trendingTv' | 'upcomingMovies' | 'upcomingTv';

interface HomeResponse {
  trendingMovies: MediaSummary[] | null;   // null = sección caída sin datos en DB
  trendingTv: MediaSummary[] | null;
  upcomingMovies: MediaSummary[] | null;
  upcomingTv: MediaSummary[] | null;
  failedSections: HomeSection[];
}

interface CastMember { id: number; name: string; character: string; profilePath: string | null; }
interface Video { key: string; name: string; site: 'YouTube'; }

interface MovieDetail extends MediaSummary {
  tagline: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  certification: string | null;   // AR
  status: string;                 // traducido
  directors: string[];
  writers: string[];
  cast: CastMember[];             // máx. 12
  trailer: Video | null;
  budget: number | null;
  revenue: number | null;
  recommendations: MediaSummary[]; // máx. 12 (fallback similar)
}

interface Season { number: number; name: string; year: number | null; episodeCount: number; posterPath: string | null; }

interface TvDetail extends MediaSummary {
  tagline: string | null;
  episodeRunTime: number | null;
  genres: string[];
  certification: string | null;
  status: string;
  firstAirYear: number | null;
  lastAirYear: number | null;
  inProduction: boolean;
  creators: string[];
  networks: { name: string; logoPath: string | null }[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  nextEpisode: { season: number; episode: number; name: string; airDate: string } | null;
  seasons: Season[];               // temporada 0 al final
  cast: CastMember[];
  trailer: Video | null;
  recommendations: MediaSummary[];
}
```

### 5.2 Validación de entrada (backend)
- `type` ∉ {`movie`,`tv`} → `400 { error: "INVALID_TYPE" }`.
- `q` vacío tras trim o < 2 caracteres → `400 { error: "QUERY_TOO_SHORT" }`; > 100 → se trunca a 100.
- `page` no entero o < 1 → `400 { error: "INVALID_PAGE" }`; > 500 → `400`.
- `year` no entero o fuera de [1900, año actual + 2] → `400 { error: "INVALID_YEAR" }`.
- `:id` no entero positivo → `400 { error: "INVALID_ID" }`.

### 5.3 Mapeo de errores de TMDB
La tabla aplica **solo cuando no hay ningún dato en la DB** para esa clave. Si hay una fila
(fresca, vencida o expirada), un fallo de TMDB **nunca** llega al cliente: se sirve lo que
está guardado con `X-Cache: STALE-ERROR` (ver 6.2.6).

| TMDB / red | Respuesta propia | UI |
|---|---|---|
| 404 | `404 { error: "NOT_FOUND" }` (y se registra en `media.tmdb_missing_at`) | Pantalla "No encontramos este título" |
| 401 (key inválida) | `502 { error: "UPSTREAM_AUTH" }` + log `error` | Estado de error genérico |
| 429 | 1 reintento tras `Retry-After` (máx. 2 s); si persiste `503 { error: "UPSTREAM_RATE_LIMIT" }` | Error con "Reintentar" |
| 5xx / red | `502 { error: "UPSTREAM_ERROR" }` | Error con "Reintentar" |
| Timeout 8 s | `504 { error: "UPSTREAM_TIMEOUT" }` | Error con "Reintentar" |

## 6. Consideraciones técnicas

### 6.1 Backend (general)
- Cliente TMDB centralizado (un único módulo `tmdbClient` en `apps/server`) con `fetch`
  nativo, header `Authorization: Bearer ${TMDB_API_TOKEN}`, timeout 8 s y
  `language`/`region` por defecto.
- Los DTO se arman en el backend con los esquemas de `packages/shared`: el frontend nunca
  ve la forma cruda de TMDB, y en la DB se guarda la forma **normalizada**, no el JSON de TMDB.
- Rate limit propio: 120 req/min por IP sobre `/api/catalog` (`express-rate-limit`) → `429`.
- Variables de entorno:

| Variable | Obligatoria | Default | Uso |
|---|---|---|---|
| `DATABASE_URL` | Sí | — | Supabase Postgres (pooler). El server no arranca sin ella |
| `TMDB_API_TOKEN` | Sí | — | Token v4 de lectura. El server no arranca sin él |
| `TMDB_LANGUAGE` | No | `es-ES` | Idioma de TMDB `[C8]` |
| `TMDB_REGION` | No | `AR` | Región de TMDB `[C8]` |
| `CATALOG_MEMORY_CACHE_MAX` | No | `500` | Entradas de la capa L1 en memoria; `0` la desactiva |
| `CATALOG_CLEANUP_CRON` | No | `0 4 * * *` | Horario del job de limpieza (zona `America/Argentina/Buenos_Aires`) |

### 6.2 Caché persistente en Postgres `[C1]`

Todo lo que se consulta a TMDB queda guardado en Supabase Postgres. Este módulo es
**dueño de dos tablas**: `media` (compartida con Favoritos) y `catalog_cache`. Opcionalmente
hay una capa L1 en memoria por encima, que es un acelerador y no una fuente de verdad.

```
 request ─► L1 memoria (LRU, ≤60 s) ─► Postgres (media / catalog_cache) ─► TMDB
               │ hit                        │ fresca / vencida               │
               ▼                            ▼                                ▼
           responde                 responde (+ revalida en 2.º plano)   guarda y responde
```

#### 6.2.1 Tabla `media` (dueño: Catálogo; la lee Favoritos)

Una fila por título de TMDB. Guarda el **resumen** (lo que necesita una tarjeta) y, opcionalmente,
el **detalle** normalizado en `jsonb`.

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | FK de `favorites.media_id` (módulo 03) |
| `tmdb_id` | `INTEGER` | NOT NULL | |
| `media_type` | `ENUM('movie','tv')` (`enum_media_media_type`) | NOT NULL | |
| `title` | `VARCHAR(500)` | NOT NULL | Título localizado (`title` / `name`) |
| `original_title` | `VARCHAR(500)` | NULL | |
| `poster_path` | `VARCHAR(255)` | NULL | Ruta relativa de TMDB (`/abc.jpg`) |
| `backdrop_path` | `VARCHAR(255)` | NULL | |
| `release_date` | `DATE` | NULL | `release_date` (película) o `first_air_date` (serie) |
| `vote_average` | `NUMERIC(3,1)` | NULL | NULL si `vote_count = 0` |
| `vote_count` | `INTEGER` | NOT NULL, default 0 | |
| `overview` | `TEXT` | NULL | |
| `overview_lang` | `VARCHAR(2)` | NULL | `es` / `en` (RN-04) |
| `fetched_at` | `TIMESTAMPTZ` | NOT NULL | Última actualización del **resumen** desde TMDB |
| `detail` | `JSONB` | NULL | `MovieDetail` o `TvDetail` normalizado (sección 5.1) |
| `detail_schema_version` | `SMALLINT` | NULL | Si no coincide con `CATALOG_SCHEMA_VERSION`, se trata como si no hubiera detalle |
| `detail_fetched_at` | `TIMESTAMPTZ` | NULL | |
| `detail_expires_at` | `TIMESTAMPTZ` | NULL | Fin de la frescura del detalle |
| `detail_stale_until` | `TIMESTAMPTZ` | NULL | Fin de la ventana de revalidación |
| `refreshing_until` | `TIMESTAMPTZ` | NULL | Reserva de revalidación (6.2.5) |
| `tmdb_missing_at` | `TIMESTAMPTZ` | NULL | Última vez que TMDB respondió 404 (caché negativa) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NOT NULL | Timestamps de Sequelize |

Índices y restricciones:
- `UNIQUE (media_type, tmdb_id)`: identidad del título; permite `INSERT … ON CONFLICT`.
- `INDEX (fetched_at)`: para la limpieza.
- Favoritos crea su FK con `ON DELETE RESTRICT`: una fila de `media` con favoritos nunca se borra.

Reglas de escritura:
- RN-37. **Solo el módulo Catálogo escribe en `media`.** Lo hace en dos casos: (1) al guardar
  cualquier lista o búsqueda, se hace *upsert* en bloque de los 20 resúmenes de esa página;
  (2) al traer un detalle, se actualizan el resumen y el `detail` de esa fila. Otros módulos
  usan `ensureMedia` (6.3).
- RN-38. El *upsert* de resúmenes **no pisa** `detail*` ni `tmdb_missing_at`, y solo actualiza
  si el dato nuevo es más reciente (`EXCLUDED.fetched_at > media.fetched_at`).
- RN-39. El *upsert* en bloque desde listas corre **después** de responder (no suma
  latencia). Si falla, se registra en el log `warn` y la respuesta no se ve afectada.

#### 6.2.2 Tabla `catalog_cache` (listas y búsquedas)

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `cache_key` | `VARCHAR(512)` | PK | Ver 6.2.3 |
| `kind` | `ENUM('trending','upcoming','discover','search')` | NOT NULL | |
| `params` | `JSONB` | NOT NULL | Parámetros normalizados, para depurar y medir |
| `payload` | `JSONB` | NOT NULL | `Paged<MediaSummary>` ya normalizado |
| `schema_version` | `SMALLINT` | NOT NULL | Si no coincide con `CATALOG_SCHEMA_VERSION`, la fila cuenta como ausente |
| `fetched_at` | `TIMESTAMPTZ` | NOT NULL | Cuándo se trajo de TMDB |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Fin de la frescura (`fetched_at + TTL`) |
| `stale_until` | `TIMESTAMPTZ` | NOT NULL | Fin de la ventana de revalidación |
| `refreshing_until` | `TIMESTAMPTZ` | NULL | Reserva de revalidación (6.2.5) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

Índices: PK en `cache_key`; `INDEX (kind, stale_until)` para la limpieza.

La lista guarda los `MediaSummary` completos (desnormalizados) para responder con **una
sola lectura**. Además, la copia "canónica" de cada título queda en `media` (RN-37).

#### 6.2.3 Clave de caché

Formato: `v{CATALOG_SCHEMA_VERSION}:{kind}:{mediaType}:{param=valor;…}:{language}:{region}`,
con los parámetros en orden alfabético y sin los vacíos. Ejemplos:

```
v1:trending:movie:page=1;window=week:es-ES:AR
v1:upcoming:movie:page=2;year=2026:es-ES:AR
v1:discover:tv:from=2026-10-26;page=1;to=2027-01-24:es-ES:AR
v1:search:tv:page=1;q=breaking bad;year=2008:es-ES:AR
```

- `q` se normaliza igual que en RN-13 y además se pasa a minúsculas (TMDB no distingue mayúsculas).
- En `discover:tv`, las fechas `from`/`to` (hoy y hoy + 90 días, RN-08) forman parte de la
  clave, así que la entrada cambia sola cada día.

#### 6.2.4 Tiempos de vida (TTL) por endpoint

| Recurso | Dónde | Fresca (`expires_at`) | Revalidación en 2.º plano hasta (`stale_until`) | Borrado por limpieza |
|---|---|---|---|---|
| Trending día | `catalog_cache` | 1 h | + 24 h | 7 días después de `stale_until` |
| Trending semana | `catalog_cache` | 3 h | + 48 h | 7 días después de `stale_until` |
| Upcoming películas | `catalog_cache` | 6 h | + 48 h | 7 días después de `stale_until` |
| Discover series (próximas) | `catalog_cache` | 6 h | + 48 h | 7 días después de `stale_until` |
| Búsqueda | `catalog_cache` | 6 h | + 3 días | 3 días después de `stale_until` |
| Detalle de película | `media.detail` | 24 h | + 7 días | Se vacía `detail` a los 30 días sin refrescar |
| Detalle de serie | `media.detail` | 12 h | + 7 días | Se vacía `detail` a los 30 días sin refrescar |
| Caché negativa (404) | `media.tmdb_missing_at` | 24 h | — | — |
| Resumen en `media` | `media` | Sin TTL propio: se actualiza al pasar por listas o por el detalle | — | Ver 6.2.7 |

Los valores son constantes en `apps/server` (no son variables de entorno) para que coincidan
en todos los entornos.

#### 6.2.5 Estrategia stale-while-revalidate

Para cada request (lista o detalle):

1. **L1 en memoria** (si `CATALOG_MEMORY_CACHE_MAX > 0`): hit → responde con `X-Cache: MEMORY`.
   El TTL en L1 es `min(60 s, tiempo hasta expires_at)`; solo guarda entradas frescas.
2. **Lectura en Postgres** por clave (o por `(media_type, tmdb_id)` en el detalle):
   - **Fresca** → responde con `X-Cache: HIT`.
   - **Vencida** (`expires_at ≤ now < stale_until`) → responde **ya** con lo guardado
     (`X-Cache: STALE`) y lanza la revalidación en segundo plano (paso 4).
   - **Expirada** o ausente → pide a TMDB **en el momento** (paso 3).
3. **Pedido a TMDB en el momento**: si sale bien, guarda (`INSERT … ON CONFLICT DO UPDATE`)
   y responde con `X-Cache: MISS`. Si falla, va a 6.2.6.
4. **Revalidación en segundo plano, una sola a la vez**: antes de llamar a TMDB, se toma una
   reserva con un `UPDATE … SET refreshing_until = now() + 30 s WHERE cache_key = ? AND
   (refreshing_until IS NULL OR refreshing_until < now()) RETURNING`. Si no devuelve fila, otra
   instancia ya está revalidando y no se hace nada. Al terminar, bien o mal, se pone
   `refreshing_until = NULL`. Si la revalidación falla, la fila no cambia y se registra en el log `warn`.
5. **Pedidos simultáneos dentro del proceso**: si llegan N requests iguales con la caché
   vacía, se hace una sola llamada a TMDB (un mapa de promesas en curso por clave).

#### 6.2.6 Si TMDB falla

- RN-40. Si hay **cualquier** fila para esa clave con la `schema_version` actual (fresca,
  vencida o expirada, sin importar su antigüedad), se sirve lo que hay en la DB con
  `X-Cache: STALE-ERROR`, `200` y `Cache-Control: max-age=0`. La UI no muestra error.
- RN-41. Si no hay fila, se responde según la tabla de la sección 5.3 (502/503/504), y la UI
  muestra el estado de error con "Reintentar".
- RN-42. TMDB responde 404 en un detalle: se escribe `media.tmdb_missing_at = now()` si la
  fila existe (no se crea una fila nueva para un ID inexistente) y se responde 404. Durante
  24 h los pedidos a ese ID responden 404 sin consultar TMDB. Si después TMDB lo devuelve,
  se limpia `tmdb_missing_at`.
- RN-43. **Postgres no disponible**: el catálogo sigue funcionando en modo degradado. Se lee
  de L1 y, si no está ahí, se pide directo a TMDB sin persistir. Se registra en el log `error`
  y se agrega el header `X-Cache: BYPASS`. `ensureMedia` sí falla (sin DB no hay favorito).

#### 6.2.7 Limpieza de entradas vencidas

- Job programado dentro del server (`node-cron`, `CATALOG_CLEANUP_CRON`, por defecto todos los
  días a las 04:00 ART). También puede correrse a mano con
  `npm run catalog:cleanup -w apps/server`.
- Exclusión mutua entre instancias con `pg_try_advisory_xact_lock(<id fijo del job>)`: si otra
  instancia tiene el lock, el job termina sin hacer nada.
- Borra en lotes de 1 000 filas para no bloquear la tabla:
  1. `catalog_cache` con `stale_until` vencido hace más tiempo que la retención de su `kind` (6.2.4).
  2. `catalog_cache` con `schema_version` distinta de la actual.
  3. `media.detail` (y sus columnas `detail_*`) se ponen en `NULL` si `detail_fetched_at` tiene más de 30 días.
  4. Filas de `media` **sin favoritos** (`NOT EXISTS` sobre `favorites`) cuyo
     `GREATEST(fetched_at, detail_fetched_at)` tenga más de 180 días.
- Registra en el log `info` cuántas filas tocó en cada paso.

#### 6.2.8 Migraciones Sequelize

Están en `apps/server/src/db/migrations/` (TypeScript, con `sequelize-cli` o `umzug`, según
lo que defina la base del server) y corren contra `DATABASE_URL`:

| Orden | Migración | Contenido |
|---|---|---|
| 1 | `20261026120000-create-media.ts` | `CREATE EXTENSION IF NOT EXISTS pgcrypto` (si hace falta para `gen_random_uuid()`), enum `enum_media_media_type`, tabla `media`, `UNIQUE (media_type, tmdb_id)`, índice `fetched_at`. El `down` borra la tabla y el enum |
| 2 | `20261026120100-create-catalog-cache.ts` | Enum `enum_catalog_cache_kind`, tabla `catalog_cache`, índice `(kind, stale_until)`. El `down` borra la tabla y el enum |

- La migración de `favorites` (módulo 03) debe tener un timestamp **posterior** a
  `create-media`, porque depende de esa FK.
- Supabase: las migraciones y el advisory lock necesitan una conexión en **modo sesión**. Si
  `DATABASE_URL` apunta al pooler en modo transacción (puerto 6543), las migraciones se
  corren con la URL de modo sesión (puerto 5432) del mismo proyecto.
- No se usa `sequelize.sync()` en ningún entorno: el esquema lo definen solo las migraciones.
- Los modelos `Media` y `CatalogCache` se exportan desde el módulo `catalog`. Favoritos
  importa `Media` **solo para leer** y para declarar la asociación `Favorite.belongsTo(Media)`.

### 6.3 Servicio `ensureMedia` (para Favoritos)

Lo exporta el módulo `catalog` de `apps/server`. Firma:

```ts
ensureMedia(tmdbId: number, mediaType: MediaType, opts?: { transaction?: Transaction }): Promise<MediaRecord>

// MediaRecord = { id, tmdbId, mediaType, title, posterPath, backdropPath,
//                 releaseDate, voteAverage, voteCount, fetchedAt }   (tipo en packages/shared)
```

Comportamiento:

| Situación | Resultado |
|---|---|
| La fila existe y `tmdb_missing_at` es NULL | Devuelve la fila **sin llamar a TMDB**. Si `fetched_at` tiene más de 7 días, además la refresca en segundo plano |
| La fila existe y `tmdb_missing_at` es de hace menos de 24 h | Lanza `MediaNotFoundError` sin llamar a TMDB |
| No existe (o `tmdb_missing_at` tiene más de 24 h) | Pide el detalle a TMDB con el mismo flujo que `GET /movie/:id` (así también deja guardado el detalle), hace *upsert* y devuelve la fila |
| TMDB responde 404 | Lanza `MediaNotFoundError`. Favoritos lo traduce a 404 |
| TMDB falla (timeout, 5xx, 429 persistente, 401) y no hay fila | Lanza `UpstreamUnavailableError`. Favoritos lo traduce a 502 y no crea el favorito |
| Llamadas simultáneas con el mismo par | `INSERT … ON CONFLICT (media_type, tmdb_id) DO UPDATE … RETURNING id`: todas reciben el **mismo** `id` |
| `tmdbId`/`mediaType` inválidos | Lanza `InvalidMediaRefError` (validación con el esquema zod compartido) |

- La llamada a TMDB ocurre **fuera** de la transacción recibida. Solo el *upsert* se
  une a `opts.transaction`, para no tener una transacción abierta mientras se espera a la red.
- Los errores son clases exportadas por el módulo `catalog`, con un `code` estable
  (`MEDIA_NOT_FOUND`, `UPSTREAM_UNAVAILABLE`, `INVALID_MEDIA_REF`).

### 6.4 Frontend
- Data fetching con **RTK Query** (`createApi`, parte de Redux Toolkit) bajo `catalogApi` en `apps/client`, tipado con los DTO de `packages/shared`;
  la caché de RTK Query evita repetir pedidos al navegar atrás/adelante.
  Para el scroll infinito se usa `infiniteQuery` de RTK Query (o `merge` + `serializeQueryArgs`).
- La URL es la fuente de verdad de búsqueda (`q`, `tipo`, `anio`); el slice de UI solo
  guarda estado efímero (modal de tráiler abierto, toggle de ventana de tendencias).
- Debounce del input 400 ms; se cancela la request anterior (abort) al cambiar el término.
- Restauración de scroll al volver del detalle a la grilla (posición y páginas cargadas).
- Imágenes con `loading="lazy"`, `srcset` por tamaño, `width/height` explícitos para evitar CLS.
- Componentes clave: `MediaCard`, `MediaGrid`, `Carousel`, `HeroBanner`, `SearchBar`,
  `YearFilter`, `TypeTabs`, `MovieDetail`, `TvDetail`, `TrailerModal`, `Skeleton*`,
  `EmptyState`, `ErrorState`, `FavoriteButtonSlot` (provisto por módulo 03).

### 6.5 Diseño (design-taste-frontend · VARIANCE 6 / MOTION 5 / DENSITY 5)
- Tema oscuro por defecto; Tailwind v4 (tokens en `@theme`), Motion para transiciones.
- Hover de tarjeta: leve escala del póster + aparición del puntaje y botón favorito
  (en touch, siempre visibles).
- Transición de entrada de grilla con stagger corto; skeletons con shimmer sutil;
  respeta `prefers-reduced-motion` (sin escalas ni stagger).
- Carruseles: scroll horizontal con `scroll-snap`, flechas en desktop, swipe en mobile.

### 6.6 Accesibilidad
- Tarjetas son enlaces con `aria-label="<Título> (<año>), <Película|Serie>"`.
- Pestañas con `role="tablist"`; anuncio `aria-live="polite"` con "N resultados".
- Modal de tráiler con foco atrapado y cierre por `Esc`.
- Contraste AA sobre fondos oscuros; foco visible.

### 6.7 Responsive
- Breakpoints Tailwind por defecto. Mobile (<640 px): header compacto con ícono de lupa
  que expande el input a ancho completo; filtros en una fila con scroll horizontal;
  detalle en una columna con backdrop arriba y póster superpuesto.

## 7. Casos borde

| # | Caso | Comportamiento |
|---|---|---|
| CB-01 | Término con < 2 caracteres | No se busca; texto de ayuda "Escribí al menos 2 caracteres". |
| CB-02 | `/buscar` sin `q` | Estado inicial: "¿Qué querés ver hoy?" + carrusel de tendencias. |
| CB-03 | 0 resultados en ambos tipos | Estado vacío con el término; si hay año, botón "Quitar filtro de año". |
| CB-04 | 0 resultados solo en la pestaña activa | Cambio automático a la otra pestaña (RN-11) solo en la carga inicial. |
| CB-05 | Caracteres especiales / emojis / comillas | Se codifican en la URL y se envían tal cual a TMDB. |
| CB-06 | Escritura rápida | Solo la última request se pinta (abort de las previas). |
| CB-07 | Página 500 alcanzada | "No hay más resultados". |
| CB-08 | Ítems duplicados entre páginas | Se deduplican (RN-20). |
| CB-09 | Sin póster / backdrop | Placeholder (RN-34). |
| CB-10 | Sin sinopsis en es ni en | "Sin sinopsis disponible." |
| CB-11 | Película sin fecha / sin duración | "Fecha por confirmar" / se oculta la duración. |
| CB-12 | ID inexistente o contenido adulto | Pantalla "No encontramos este título" (404). |
| CB-13 | Serie sin temporadas cargadas | Se oculta la sección de temporadas. |
| CB-14 | TMDB caído y **sin datos en la DB** para esa clave | Estado de error con "Reintentar". En el Home, el error se muestra por carrusel (`failedSections`), no en toda la página. Si hay datos en la DB, se sirven (RN-40) y no hay error. |
| CB-15 | Upcoming con fechas pasadas | Filtradas en backend (RN-09). |
| CB-16 | Usuario offline | Banner "Sin conexión" y los datos ya cacheados siguen visibles. |
| CB-17 | Año en URL fuera de rango | Se ignora (RN-26). |
| CB-18 | Slug incorrecto en la URL (`/pelicula/550-otro`) | Se carga por ID y se reemplaza la URL por el slug correcto. |
| CB-19 | Postgres caído | Modo degradado (RN-43): L1 o TMDB directo, sin persistir. Agregar favoritos falla (lo maneja el módulo 03). |
| CB-20 | Dos instancias revalidan la misma clave a la vez | Solo una consigue la reserva `refreshing_until`; la otra sirve lo que hay guardado y no llama a TMDB. |
| CB-21 | Dos usuarios marcan como favorito el mismo título nuevo al mismo tiempo | `ensureMedia` hace *upsert* con `ON CONFLICT`: una sola fila en `media`, y ambos reciben el mismo `id`. |
| CB-22 | Un título favorito desaparece de TMDB | La fila de `media` no se borra (FK `RESTRICT`); la tarjeta del favorito sigue con el resumen guardado; el detalle responde 404 (RN-42). |
| CB-23 | Cambia la forma de un DTO (deploy nuevo) | Se sube `CATALOG_SCHEMA_VERSION`: las filas viejas cuentan como ausentes, se rellenan cuando se piden y la limpieza borra las restantes. |
| CB-24 | Lista guardada ayer con estrenos que hoy ya pasaron | El filtro de RN-09 se aplica al servir. |
| CB-25 | Búsquedas con términos únicos que llenan `catalog_cache` | La retención corta de `search` (6.2.4) más la limpieza diaria acotan el crecimiento. |

## 8. Criterios de aceptación (Gherkin)

```gherkin
Feature: Home del catálogo
  Como usuario quiero ver tendencias y próximos estrenos para descubrir qué ver

  Background:
    Given el backend responde correctamente a "/api/catalog/home"

  Scenario: Ver el Home sin sesión iniciada
    Given no inicié sesión
    When abro "/"
    Then veo el hero con el primer ítem de tendencias de la semana
    And veo los carruseles "Tendencias", "Próximamente en cines" y "Series que se vienen"
    And cada carrusel muestra hasta 20 tarjetas

  Scenario: Cambiar la ventana de tendencias
    Given estoy en el Home con "Esta semana" seleccionado
    When selecciono "Hoy"
    Then el carrusel "Tendencias" se recarga con las tendencias del día
    And el resto de los carruseles no cambia

  Scenario: Cambiar el tipo de tendencias
    Given estoy en el Home con "Películas" seleccionado en "Tendencias"
    When selecciono "Series"
    Then el carrusel "Tendencias" muestra solo series

  Scenario: Próximos estrenos no incluyen fechas pasadas
    Given TMDB devuelve en upcoming una película con fecha anterior a hoy
    When abro "/"
    Then esa película no aparece en "Próximamente en cines"

  Scenario: Series que se vienen
    When abro "/"
    Then "Series que se vienen" muestra series con fecha de estreno entre hoy y hoy + 90 días
    And están ordenadas por popularidad descendente

  Scenario: Ver todo de un carrusel
    When hago clic en "Ver todo" de "Próximamente en cines"
    Then navego a "/explorar/proximamente/pelicula"
    And veo la grilla con scroll infinito y filtro por año

  Scenario: Falla un carrusel
    Given la lista de series próximas falla en el backend
    When abro "/"
    Then los demás carruseles se muestran normalmente
    And en "Series que se vienen" veo "No pudimos cargar esta sección" con el botón "Reintentar"

Feature: Búsqueda de películas y series

  Scenario: Búsqueda mientras escribo
    Given estoy en cualquier pantalla
    When escribo "matrix" en el buscador
    And pasan 400 ms sin escribir
    Then navego a "/buscar?q=matrix&tipo=pelicula"
    And veo una grilla de películas que coinciden con "matrix"
    And las pestañas muestran "Películas (N)" y "Series (M)"

  Scenario: Término demasiado corto
    When escribo "m" en el buscador
    Then no se realiza ninguna búsqueda
    And veo el texto "Escribí al menos 2 caracteres"

  Scenario: Cambiar a la pestaña Series
    Given estoy en "/buscar?q=dark&tipo=pelicula"
    When selecciono la pestaña "Series"
    Then la URL pasa a "/buscar?q=dark&tipo=serie"
    And veo una grilla de series que coinciden con "dark"

  Scenario: Cambio automático de pestaña cuando no hay películas
    Given "breaking bad" tiene 0 películas y más de 0 series
    When busco "breaking bad"
    Then la pestaña activa es "Series"

  Scenario: Sin resultados
    When busco "xqzwvjk"
    Then veo "No encontramos resultados para “xqzwvjk”"
    And veo sugerencias "Revisá la ortografía" y "Probá con otro título"

  Scenario: URL compartible
    Given copio la URL "/buscar?q=alien&tipo=pelicula&anio=1979"
    When la abro en otra pestaña
    Then veo los mismos resultados con el año 1979 seleccionado

  Scenario: Solo se pinta la última búsqueda
    When escribo "star" y luego, antes de que responda, "star wars"
    Then la grilla muestra solo resultados de "star wars"

Feature: Grilla con scroll infinito

  Scenario: Cargar la página siguiente
    Given veo 20 resultados de una búsqueda con 3 páginas
    When hago scroll hasta cerca del final de la grilla
    Then se cargan 20 resultados más debajo de los existentes
    And veo tarjetas skeleton mientras cargan

  Scenario: Fin de resultados
    Given cargué la última página disponible
    When llego al final de la grilla
    Then veo "No hay más resultados"
    And no se hacen más peticiones

  Scenario: Error al cargar una página posterior
    Given cargué la página 1
    And la página 2 falla
    Then conservo los 20 resultados de la página 1
    And veo el botón "Reintentar" al final de la grilla

  Scenario: Volver del detalle conserva la posición
    Given cargué 3 páginas y abrí el detalle de la tarjeta 47
    When vuelvo atrás
    Then veo la grilla con las 3 páginas y en la misma posición de scroll

Feature: Filtro por año

  Scenario Outline: Filtrar por año
    Given busqué "<termino>" en la pestaña "<pestana>"
    When selecciono el año <anio>
    Then la URL incluye "anio=<anio>"
    And todos los resultados tienen año <anio>
    And la grilla vuelve a la página 1

    Examples:
      | termino   | pestana   | anio |
      | batman    | Películas | 1989 |
      | the office| Series    | 2005 |

  Scenario: Quitar el filtro
    Given tengo el año 1989 seleccionado
    When selecciono "Todos los años"
    Then la URL no incluye "anio"
    And veo resultados de todos los años

  Scenario: Filtro sin resultados
    Given busqué "batman" con el año 1950
    When no hay resultados
    Then veo el estado vacío con el botón "Quitar filtro de año"

  Scenario: Año inválido en la URL
    When abro "/buscar?q=batman&anio=3020"
    Then el filtro muestra "Todos los años"
    And veo resultados de todos los años

  Scenario: El filtro persiste al cambiar de pestaña
    Given tengo el año 2010 seleccionado en "Películas"
    When cambio a "Series"
    Then el año 2010 sigue seleccionado y se aplica a las series

Feature: Detalle de película

  Scenario: Ver el detalle completo
    When abro "/pelicula/603"
    Then veo backdrop, póster, título, año, clasificación, duración y géneros
    And veo el puntaje con un decimal y la cantidad de votos
    And veo la sinopsis, el director y hasta 12 integrantes del reparto
    And veo el carrusel "Recomendadas"
    And veo el botón de favorito (provisto por el módulo de favoritos)

  Scenario: Ver el tráiler
    Given la película tiene un tráiler de YouTube
    When hago clic en "Ver tráiler"
    Then se abre un modal con el video
    And al presionar Esc el modal se cierra y el foco vuelve al botón

  Scenario: Película sin tráiler
    Given la película no tiene videos
    When abro su detalle
    Then no veo el botón "Ver tráiler"

  Scenario: Sinopsis solo en inglés
    Given la película no tiene sinopsis en español
    When abro su detalle
    Then veo la sinopsis en inglés con la etiqueta "Sinopsis en inglés"

  Scenario: Película inexistente
    When abro "/pelicula/999999999"
    Then veo "No encontramos este título"
    And un enlace "Volver al inicio"

  Scenario: ID inválido
    When abro "/pelicula/abc"
    Then veo la página 404

Feature: Detalle de serie

  Scenario: Ver el detalle de una serie en emisión
    Given la serie está "En emisión" y tiene próximo episodio
    When abro "/serie/1399"
    Then veo nombre, años "2011–", estado "En emisión", creadores y cadenas
    And veo la cantidad de temporadas y episodios
    And veo el bloque "Próximo episodio" con número, nombre y fecha

  Scenario: Lista de temporadas
    Given la serie tiene temporadas 0, 1 y 2
    When abro su detalle
    Then veo las temporadas en orden 1, 2 y al final "Especiales"
    And cada temporada muestra póster, año y cantidad de episodios

  Scenario: Serie finalizada
    Given la serie terminó en 2013 y empezó en 2008
    When abro su detalle
    Then veo los años "2008–2013" y el estado "Finalizada"
    And no veo el bloque "Próximo episodio"

Feature: Estados de carga y error

  Scenario: Carga inicial
    When abro cualquier pantalla del catálogo y los datos aún no llegaron
    Then veo skeletons con la forma del contenido final

  Scenario: Error del proveedor sin datos guardados
    Given TMDB no responde
    And no hay ninguna entrada en la DB para la búsqueda "alien"
    When abro "/buscar?q=alien"
    Then veo "Algo salió mal al cargar el catálogo" y el botón "Reintentar"
    When hago clic en "Reintentar" y TMDB ya responde
    Then veo los resultados

  Scenario: La API key nunca llega al cliente
    When inspecciono las peticiones de red del navegador
    Then ninguna petición va a "api.themoviedb.org"
    And ninguna respuesta contiene el token de TMDB

Feature: Caché persistente del catálogo en Postgres

  Background:
    Given la capa L1 en memoria está vacía

  Scenario: La primera consulta se guarda en la DB
    Given no hay ninguna entrada en "catalog_cache" para trending movie/week página 1
    When pido "GET /api/catalog/trending/movie?window=week&page=1"
    Then el backend consulta TMDB una vez
    And recibo 20 resultados con el header "X-Cache: MISS"
    And existe una fila en "catalog_cache" con expires_at = fetched_at + 3 h
    And los 20 títulos existen en la tabla "media"

  Scenario: Una entrada fresca se sirve sin llamar a TMDB
    Given hay una entrada fresca en "catalog_cache" para esa lista
    When pido la misma lista
    Then recibo la respuesta guardada con el header "X-Cache: HIT"
    And el backend no consulta TMDB

  Scenario: Una entrada vencida se sirve y se revalida en segundo plano
    Given la entrada de "catalog_cache" venció hace 10 minutos y sigue dentro de su ventana de revalidación
    When pido la lista
    Then recibo de inmediato la respuesta guardada con el header "X-Cache: STALE"
    And el backend revalida contra TMDB en segundo plano
    And al terminar, la fila tiene fetched_at y expires_at nuevos

  Scenario: Una sola revalidación aunque lleguen muchos pedidos
    Given la entrada está vencida
    When llegan 10 pedidos iguales a la vez, repartidos entre 2 instancias del server
    Then todos reciben la respuesta guardada
    And TMDB recibe una sola consulta para esa clave

  Scenario: Una entrada expirada se pide a TMDB en el momento
    Given la entrada pasó su stale_until
    And TMDB responde correctamente
    When pido la lista
    Then recibo datos nuevos con el header "X-Cache: MISS"

  Scenario Outline: Si TMDB falla, se sirve lo que hay en la DB
    Given hay una entrada <estado> para "<recurso>"
    And TMDB responde <falla>
    When pido "<recurso>"
    Then recibo 200 con los datos guardados y el header "X-Cache: STALE-ERROR"
    And la UI no muestra ningún error

    Examples:
      | estado   | recurso                          | falla         |
      | expirada | /api/catalog/movie/603           | 500           |
      | expirada | /api/catalog/search?q=alien&type=movie&page=1 | timeout       |
      | vencida  | /api/catalog/upcoming/tv?page=1  | 429 repetido  |

  Scenario: Caché negativa para un título inexistente
    Given TMDB responde 404 para la película 999999999
    When pido "/api/catalog/movie/999999999" dos veces en menos de 24 h
    Then ambas respuestas son 404
    And TMDB recibe una sola consulta

  Scenario: Pedir un detalle actualiza la fila de media
    Given la película 603 existe en "media" sin detalle
    When pido "/api/catalog/movie/603"
    Then la fila de 603 tiene "detail" con el MovieDetail normalizado
    And detail_expires_at = detail_fetched_at + 24 h

  Scenario: Postgres no disponible
    Given la base de datos no responde
    And TMDB responde correctamente
    When pido "/api/catalog/home"
    Then recibo las listas con el header "X-Cache: BYPASS"
    And se registra un error en el log

  Scenario: Limpieza diaria
    Given hay filas de "catalog_cache" de tipo search con stale_until de hace 5 días
    And hay filas de "media" sin favoritos que no se actualizan hace 200 días
    And hay filas de "media" con favoritos que no se actualizan hace 200 días
    When corre el job de limpieza
    Then se borran las entradas search y las filas de media sin favoritos
    And las filas de media con favoritos se conservan

  Scenario: La limpieza no corre dos veces a la vez
    Given dos instancias del server disparan la limpieza al mismo tiempo
    Then solo una consigue el advisory lock y borra
    And la otra termina sin hacer nada

Feature: Servicio ensureMedia (lo usa el módulo Favoritos)

  Scenario: El título ya existe en media
    Given la película 603 existe en "media"
    When Favoritos llama a ensureMedia(603, "movie")
    Then recibe el registro con su id
    And TMDB no recibe ninguna consulta

  Scenario: El título no existe en media
    Given la serie 1399 no existe en "media"
    And TMDB responde correctamente
    When Favoritos llama a ensureMedia(1399, "tv")
    Then se crea una fila en "media" con resumen y detalle
    And recibe el registro con su id nuevo

  Scenario: El título no existe en TMDB
    Given TMDB responde 404 para la película 999999999
    When Favoritos llama a ensureMedia(999999999, "movie")
    Then recibe el error MEDIA_NOT_FOUND
    And no se crea ninguna fila en "media"

  Scenario: TMDB caído y el título no está guardado
    Given la película 42 no existe en "media"
    And TMDB no responde
    When Favoritos llama a ensureMedia(42, "movie")
    Then recibe el error UPSTREAM_UNAVAILABLE

  Scenario: Llamadas simultáneas
    Given la película 155 no existe en "media"
    When dos usuarios llaman a ensureMedia(155, "movie") al mismo tiempo
    Then hay una sola fila de 155 en "media"
    And ambos reciben el mismo id

Feature: Versión mobile

  Scenario: Grilla en mobile
    Given uso un viewport de 375 px
    When veo resultados de búsqueda
    Then la grilla tiene 2 columnas
    And el puntaje y el botón de favorito están siempre visibles en cada tarjeta

  Scenario: Buscador en mobile
    Given uso un viewport de 375 px
    When toco el ícono de lupa
    Then el input de búsqueda se expande a ancho completo con foco

  Scenario: Carrusel en mobile
    Given uso un viewport de 375 px
    When deslizo un carrusel horizontalmente
    Then las tarjetas se ajustan con scroll-snap
    And no hay scroll horizontal de la página completa
```

## 9. Mockups ASCII

### 9.1 Home — desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 Buscar películas o series...   ]  (Ingresar) │
├──────────────────────────────────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░ BACKDROP (w1280) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░                                                                         ░░│
│░░  TENDENCIA #1 · PELÍCULA                                                ░░│
│░░  Dune: Parte Tres                                                       ░░│
│░░  2026 · ★ 8.4 · Ciencia ficción, Aventura                               ░░│
│░░  Paul Atreides enfrenta las consecuencias de su ascenso mientras el     ░░│
│░░  imperio se fractura y las casas menores conspiran para...              ░░│
│░░  [ ▶ Ver detalle ]  [ ♡ ]                                               ░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                                              │
│  Tendencias      ( Hoy | ●Esta semana )   ( ●Películas | Series )  Ver todo →│
│  ‹ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───   ›  │
│    │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │PO       │
│    │ 2:3 ♡│ │     ♡│ │     ♡│ │     ♡│ │     ♡│ │     ♡│ │     ♡│ │         │
│    │★ 8.4 │ │★ 7.9 │ │★ 7.1 │ │★ 6.8 │ │★ 8.0 │ │★ 7.3 │ │★ 6.5 │ │         │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───      │
│    Dune: P…  Wicked…  Gladia…  Moana 2  Anora    Nosfer…  Conclave  Fl…      │
│    2026      2024     2024     2024     2024     2024     2024      20…      │
│                                                                              │
│  Próximamente en cines                                           Ver todo →  │
│  ‹ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───   ›  │
│    │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │POSTER│ │PO       │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───      │
│    14 nov    21 nov   28 nov   5 dic    12 dic   19 dic   Por conf. …        │
│                                                                              │
│  Series que se vienen                                            Ver todo →  │
│  ‹ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───   ›  │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [TMDB] Este producto usa la API de TMDB pero no está avalado ni certificado  │
│        por TMDB.                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Home — mobile (375 px)

```
┌─────────────────────────────┐
│ ▣ VISION MAX         🔍  ☰  │
├─────────────────────────────┤
│░░░░░░ BACKDROP (w780) ░░░░░░│
│░ TENDENCIA #1 · PELÍCULA   ░│
│░ Dune: Parte Tres          ░│
│░ 2026 · ★ 8.4              ░│
│░ [ ▶ Ver detalle ]  [ ♡ ]  ░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                             │
│ Tendencias        Ver todo →│
│ (Hoy|●Semana) (●Pelis|Series)│
│ ┌─────┐ ┌─────┐ ┌──         │
│ │POST ♡│ │POST ♡│ │PO   ← swipe│
│ │★ 8.4 │ │★ 7.9 │ │           │
│ └─────┘ └─────┘ └──         │
│ Dune: P… Wicked   Gl…       │
│                             │
│ Próximamente en cines    →  │
│ ┌─────┐ ┌─────┐ ┌──         │
│ └─────┘ └─────┘ └──         │
│                             │
│ Series que se vienen     →  │
│ ┌─────┐ ┌─────┐ ┌──         │
│ └─────┘ └─────┘ └──         │
├─────────────────────────────┤
│ [TMDB] Usa la API de TMDB…  │
└─────────────────────────────┘
```

### 9.3 Búsqueda + grilla + filtro — desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 batman                      ✕ ]  (Ingresar) │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resultados para “batman”                                                    │
│                                                                              │
│  [ ●Películas (142) ]  [ Series (37) ]               Año: [ 1989         ▾ ] │
│  ─────────────────────────────────────────────────────────────────────────── │
│  8 resultados                                                                │
│                                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ POSTER │ │ POSTER │ │ POSTER │ │ POSTER │ │ POSTER │ │  SIN   │          │
│  │  2:3  ♡│ │       ♡│ │       ♡│ │       ♡│ │       ♡│ │ IMAGEN │          │
│  │ ★ 7.2  │ │ ★ 6.1  │ │ ★ 5.8  │ │ ★ 6.4  │ │ ★ 7.0  │ │  🎬   ♡│          │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
│  Batman      Batman:    The Rise   Batman     Batman &   Batman              │
│  1989        El mito…   of Batman  Dracula    Robin…     Fan Film            │
│                                                                              │
│  ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ─┐ ┌ ─ ─ ─ ─┐ ┌ ─ ─ ─ ─┐ ┌ ─ ─ ─ ─┐          │
│  │ POSTER │ │ POSTER │   ░░░░░░     ░░░░░░     ░░░░░░     ░░░░░░  ← skeleton│
│  └────────┘ └────────┘ └ ─ ─ ─ ─┘ └ ─ ─ ─ ─┘ └ ─ ─ ─ ─┘ └ ─ ─ ─ ─┘ (pág. 2) │
│                                                                              │
│                          · · · cargando más · · ·                            │
└──────────────────────────────────────────────────────────────────────────────┘

Desplegable de año abierto:
                                                     ┌──────────────────┐
                                                     │ Todos los años   │
                                                     │ 2028             │
                                                     │ 2027             │
                                                     │ 2026             │
                                                     │ ...              │
                                                     │ ●1989            │
                                                     │ ...              │
                                                     │ 1900             │
                                                     └──────────────────┘
```

### 9.4 Búsqueda — mobile (375 px)

```
┌─────────────────────────────┐
│ ←  [ 🔍 batman          ✕ ] │
├─────────────────────────────┤
│ [●Películas 142] [Series 37]│
│ Año: [ Todos los años   ▾ ] │
│ 142 resultados              │
│ ┌───────────┐ ┌───────────┐ │
│ │  POSTER   │ │  POSTER   │ │
│ │          ♡│ │          ♡│ │
│ │ ★ 7.2     │ │ ★ 6.1     │ │
│ └───────────┘ └───────────┘ │
│ Batman        Batman: El…   │
│ 1989          2008          │
│ ┌───────────┐ ┌───────────┐ │
│ │  POSTER   │ │  POSTER   │ │
│ └───────────┘ └───────────┘ │
│        · · · cargando · · · │
└─────────────────────────────┘
```

### 9.5 Detalle de película — desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 Buscar películas o series...   ]  (Ingresar) │
├──────────────────────────────────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░ BACKDROP con degradado ░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░ ┌──────────┐                                                            ░░│
│░░ │          │  Matrix                                                    ░░│
│░░ │  POSTER  │  The Matrix (título original)                              ░░│
│░░ │  (w500)  │  1999 · [+13] · 2 h 16 min · Acción, Ciencia ficción       ░░│
│░░ │          │  ★ 8.2 (25 431 votos)                                      ░░│
│░░ │          │  “Bienvenido al mundo real.”                               ░░│
│░░ └──────────┘  [ ▶ Ver tráiler ]  [ ♡ Favorito ]                         ░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                                              │
│  Sinopsis                                       │ Estreno     31/03/1999     │
│  Un programador descubre que el mundo en el     │ Estado      Estrenada      │
│  que vive es una simulación controlada por...   │ Presupuesto US$ 63 M       │
│                                                 │ Recaudación US$ 463 M      │
│  Dirección: Lana Wachowski, Lilly Wachowski     │                            │
│  Guion: Lana Wachowski, Lilly Wachowski         │                            │
│                                                                              │
│  Reparto principal                                                           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  ›                 │
│  │foto│ │foto│ │foto│ │foto│ │foto│ │foto│ │ 👤 │ │foto│                    │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                    │
│  Keanu   Laurence Carrie-  Hugo   ...                                        │
│  Reeves  Fishburne Anne    Weaving                                           │
│  Neo     Morpheus Trinity  Agente Smith                                      │
│                                                                              │
│  Recomendadas                                                                │
│  ‹ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ›                 │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [TMDB] Este producto usa la API de TMDB pero no está avalado ni certificado… │
└──────────────────────────────────────────────────────────────────────────────┘

Modal de tráiler:
┌──────────────────────────────────────────────────────────────┐
│  Matrix — Tráiler oficial                               [✕]  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │                ▶  (embed youtube-nocookie)             │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 9.6 Detalle de película — mobile (375 px)

```
┌─────────────────────────────┐
│ ←                      🔍   │
│░░░░░░ BACKDROP (w780) ░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ┌──────┐                   │
│  │POSTER│ Matrix            │
│  │      │ 1999 · +13 · 2h16 │
│  └──────┘ ★ 8.2 (25 431)    │
│ Acción · Ciencia ficción    │
│ [ ▶ Ver tráiler ] [ ♡ ]     │
│                             │
│ Sinopsis                    │
│ Un programador descubre que │
│ el mundo en el que vive...  │
│                             │
│ Dirección                   │
│ Lana y Lilly Wachowski      │
│                             │
│ Reparto        ← swipe →    │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐         │
│ └──┘ └──┘ └──┘ └──┘         │
│                             │
│ Estreno       31/03/1999    │
│ Presupuesto   US$ 63 M      │
│                             │
│ Recomendadas   ← swipe →    │
│ ┌────┐ ┌────┐ ┌──           │
│ └────┘ └────┘ └──           │
└─────────────────────────────┘
```

### 9.7 Detalle de serie — desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 Buscar películas o series...   ]  (Ingresar) │
├──────────────────────────────────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░ BACKDROP con degradado ░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░ ┌──────────┐                                                            ░░│
│░░ │          │  The Last of Us                                            ░░│
│░░ │  POSTER  │  2023– · [+16] · ~55 min/ep · Drama, Ciencia ficción        ░░│
│░░ │          │  ★ 8.6 (5 210 votos)   ● En emisión                        ░░│
│░░ │          │  2 temporadas · 16 episodios                               ░░│
│░░ └──────────┘  [ ▶ Ver tráiler ]  [ ♡ Favorito ]                         ░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                                              │
│  Sinopsis                                       │ Creada por                 │
│  Veinte años después de la caída de la          │ Craig Mazin, Neil Druckmann│
│  civilización, Joel debe escoltar a Ellie...    │ Cadena    [HBO]            │
│                                                 │                            │
│  ┌─ Próximo episodio ─────────────────────────┐ │                            │
│  │ T3 · E1 · “Título del episodio”            │ │                            │
│  │ 12/04/2027                                 │ │                            │
│  └────────────────────────────────────────────┘ │                            │
│                                                                              │
│  Temporadas                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                                                  │
│  │POSTER│ │POSTER│ │POSTER│                                                  │
│  └──────┘ └──────┘ └──────┘                                                  │
│  Temp. 1  Temp. 2  Especiales                                                │
│  2023     2025     2023                                                      │
│  9 ep.    7 ep.    3 ep.                                                     │
│                                                                              │
│  Reparto principal                                                           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  ›                               │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                                  │
│                                                                              │
│  Recomendadas                                                                │
│  ‹ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ›                 │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.8 Estado de carga (skeleton)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 batman                      ✕ ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                                      │
│  [ ▒▒▒▒▒▒▒▒▒ ] [ ▒▒▒▒▒▒▒ ]                              Año: [ ▒▒▒▒▒▒▒▒ ▾ ]  │
│                                                                              │
│  ┌ ─ ─ ─ ┐ ┌ ─ ─ ─ ┐ ┌ ─ ─ ─ ┐ ┌ ─ ─ ─ ┐ ┌ ─ ─ ─ ┐ ┌ ─ ─ ─ ┐                │
│   ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░   (shimmer)      │
│   ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░    ░░░░░░                  │
│  └ ─ ─ ─ ┘ └ ─ ─ ─ ┘ └ ─ ─ ─ ┘ └ ─ ─ ─ ┘ └ ─ ─ ─ ┘ └ ─ ─ ─ ┘                │
│   ▒▒▒▒▒     ▒▒▒▒▒     ▒▒▒▒▒     ▒▒▒▒▒     ▒▒▒▒▒     ▒▒▒▒▒                   │
│   ▒▒        ▒▒        ▒▒        ▒▒        ▒▒        ▒▒                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.9 Estado vacío (sin resultados)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 batman                      ✕ ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ ●Películas (0) ]  [ Series (0) ]                   Año: [ 1950        ▾ ] │
│                                                                              │
│                                  ◌                                           │
│                 No encontramos resultados para “batman” en 1950              │
│                                                                              │
│                 · Revisá la ortografía                                       │
│                 · Probá con otro título                                      │
│                                                                              │
│                         [ Quitar filtro de año ]                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Variante: /buscar sin término
│                       ¿Qué querés ver hoy?                                   │
│        Buscá por título de película o serie. Mientras, mirá lo que es        │
│        tendencia esta semana:                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                      │
```

### 9.10 Estado de error

```
Página completa:
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ VISION MAX  Inicio  Explorar        [ 🔍 alien                       ✕ ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                  ⚠                                           │
│                    Algo salió mal al cargar el catálogo                      │
│             El proveedor de datos no respondió. Probá de nuevo.              │
│                                                                              │
│                              [ Reintentar ]                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Error en un carrusel del Home:
│  Series que se vienen                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠ No pudimos cargar esta sección.                    [ Reintentar ]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │

Error al cargar página siguiente (grilla):
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
│               ⚠ No pudimos cargar más resultados.  [ Reintentar ]            │

Título inexistente (404):
│                                  ◌                                           │
│                       No encontramos este título                             │
│             Puede que haya sido eliminado o que el enlace esté mal.          │
│                           [ Volver al inicio ]                               │
```

## 10. Asunciones validadas

Validadas por el usuario el 2026-10-26. También están en `00-decisiones.md`, sección "Catálogo (02)".

| # | Tema | Asunción del borrador | Decisión final | Estado |
|---|---|---|---|---|
| C1 | Acceso a TMDB y caché | Proxy + caché LRU en memoria; no se persiste en Postgres | **Proxy con caché persistente en Postgres (Supabase)**: tablas `media` (dueño Catálogo, compartida con Favoritos) y `catalog_cache`, TTL por endpoint, stale-while-revalidate, se sirve lo que hay en la DB si TMDB falla, limpieza diaria, servicio `ensureMedia`. La capa L1 en memoria se mantiene como opcional (secciones 6.2 y 6.3) | **Cambiada** |
| C2 | Búsqueda | Pestañas Películas / Series con `/search/movie` y `/search/tv` | Igual | Confirmada |
| C3 | Paginación | Scroll infinito de 20 ítems | Igual, y es el patrón de **todas** las grillas de la app (RN-18) | Confirmada (ampliada) |
| C4 | Series próximas | Primer estreno entre hoy y hoy + 90 días (`/discover/tv`) | Igual | Confirmada |
| C5 | Contenido del detalle | Completo (ficha, reparto, tráiler, recomendadas, temporadas), sin episodios | Igual | Confirmada |
| C6 | Acceso | Home, búsqueda y detalle públicos; el favorito sin sesión redirige a login | Igual | Confirmada |
| C7 | Filtro de año | Un solo año, de 1900 a año actual + 2, aplicado en TMDB | Igual | Confirmada |
| C8 | Idioma y región | `es-ES` + `AR` fijos por variable de entorno; inglés como respaldo de la sinopsis | Igual | Confirmada |
| C9 | Estructura del Home | Hero + Tendencias (selectores Hoy/Semana y Películas/Series) + 2 carruseles de próximos | Igual | Confirmada |
| C10 | Disparo de la búsqueda | En vivo, 400 ms después de la última tecla, desde 2 caracteres, y con Enter | Igual | Confirmada |

### Cambios transversales incorporados (de `00-decisiones.md`)

- Nombre del producto: **Vision Max** (en copy y mockups).
- Monorepo TypeScript con npm workspaces: `apps/client`, `apps/server`, `packages/shared`.
  Los DTO y los esquemas zod de este módulo viven en `packages/shared`.
- DB: Supabase Postgres por `DATABASE_URL`, con Sequelize y migraciones (sin `sync`).
- Servicio de backend `ensureMedia(tmdbId, mediaType)` para que Favoritos haga *upsert* en `media`.
