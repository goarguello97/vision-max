# SPEC.md - Visión Max

## 1. Project Overview

### Project Name
Visión Max - Catálogo de Películas

### Project Type
Fullstack Web Application (PWA)

### Core Functionality
Plataforma para explorar películas usando la API de TMDB, donde usuarios registrados pueden marcar favoritos, escribir reseñas y admins pueden gestionar la plataforma.

### Target Users
- Usuarios comunes que buscan descubrir y organizar películas
- Administradores que gestionan la comunidad

---

## 2. Technology Stack

| Layer | Technology |
|-------|-------------|
| Backend Runtime | Node.js |
| Backend Framework | Express |
| Language | TypeScript |
| API Documentation | swagger-jsdoc + swagger-ui-express |
| Database | PostgreSQL |
| ORM | Prisma |
| Password Hashing | bcrypt |
| Authentication | JWT (HttpOnly cookies) |
| Validation | Zod |
| Frontend Framework | React |
| Frontend Build | Vite |
| Language | TypeScript |
| Form Handling | React Hook Form + Zod |
| PWA | Service Worker + Manifest |

---

## 3. Frontend Design System

### Docker Configuration

#### Container Strategy
- **Solo backend containerizado** - PostgreSQL y API en contenedores Docker
- **Desarrollo local** - Frontend ejecutándose localmente (no containerizado)

#### Docker Compose Structure
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: visionmax-db
    environment: POSTGRES_*, PGDATA
    ports: "5432:5432"
    volumes: postgres_data (persistent)
    healthcheck: pg_isready

  api:
    build: ./backend
    container_name: visionmax-api
    ports: "3000:3000"
    depends_on: postgres (health condition)
    environment: DATABASE_URL, JWT_*, TMDB_*
    volumes: ./backend:/app (dev: hot reload)
    healthcheck: curl /health
```

#### Docker Files (Backend)
```
backend/
├── Dockerfile          # Multi-stage build
├── .dockerignore      # Exclude node_modules, dist, .git
└── docker-commands.sh # Scripts helpers para dev
```

#### Dockerfile Backend
- **Multi-stage build** (builder → production)
- **Node. 18 Alpine** (~120MB vs ~900MB)
- **Usuario no-root** para seguridad
- **Healthcheck** integrado en `/health`

#### Development Commands
```bash
# Iniciar entorno Docker
docker compose up -d

# Ver logs
docker compose logs -f api

# Acceder a container
docker compose exec api sh

# Regenerar Prisma client
docker compose exec api npx prisma generate

# Migraciones
docker compose exec api npx prisma migrate dev

# seed data
docker compose exec api npx prisma db seed
```

### Design Philosophy
Interfaz cinematográfica premium con estética "sala de cine noir moderna". Elegancia oscura con acentos dorados que evocan la grandeur del cine clásico de Hollywood. Sensación inmersiva y inmersiva.

### Color Palette
```css
:root {
  /* Base */
  --color-bg-primary: #0a0a0f;         /* Negro profundo */
  --color-bg-secondary: #141419;       /* Gris oscuro */
  --color-bg-elevated: #1a1a22;        /* Superficie elevada */
  --color-bg-card: #111118;            /* Tarjetas */

  /* Text */
  --color-text-primary: #f5f5f0;      /* Blanco cálido */
  --color-text-secondary: #a8a8a3;    /* Gris claro */
  --color-text-muted: #5a5a55;         /* Gris medio */

  /* Accent */
  --color-accent-gold: #d4af37;        /* Dorado */
  --color-accent-gold-dim: #b8962e;    /* Dorado dim */
  --color-accent-gold-glow: rgba(212, 175, 55, 0.15); /* Glow */

  /* Accent Secondary */
  --color-accent-red: #c41e3a;        /* Rojo cine */
  --color-accent-amber: #ffbf00;      /* Ámbar */

  /* Semantic */
  --color-success: #2d7d46;
  --color-error: #c41e3a;
  --color-warning: #d4af37;

  /* Effects */
  --color-glow: rgba(212, 175, 55, 0.4);
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px var(--color-glow);
}
```

### Typography
```css
/* Display - Títulos */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
font-family: 'Bebas Neue', sans-serif;

/* Headings */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');
font-family: 'Cormorant Garamond', serif;

/* Body */
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&display=swap');
font-family: 'Source Sans 3', sans-serif;

/* Monospace */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
font-family: 'JetBrains Mono', monospace;
```

### Motion & Animation
- **Page Load**: Staggered reveals con fade + translateY (100ms delay entre elementos)
- **Hover States**: Scale sutil (1.02-1.05) + glow transition (200ms ease-out)
- **Cards**: Hover lift con shadow expansion
- **Navigation**: Smooth scroll + active states con underline animado
- **Loading**: Skeleton shimmer con gradiente dorado
- **Transitions**: Todas las transiciones minimum 200ms ease-out

### Spatial System
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 2rem;       /* 32px */
--spacing-xl: 4rem;      /* 64px */
--spacing-2xl: 6rem;     /* 96px */

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 16px;
--radius-xl: 24px;
```

### Component Design

#### Buttons
- **Primary**: Fondo dorado con texto negro, hover glow
- **Secondary**: Borde dorado con fondo transparente
- **Ghost**: Solo texto dorado con hover underline
- Border-radius: `--radius-md`

#### Cards (Películas)
- Imagen con aspect ratio 2:3
- Overlay gradiente en hover
- Rating badge con estilo "IMDb"
- Hover: scale 1.03 + shadow glow

#### Inputs
- Fondo semi-transparente
- Borde sutil con focus glow dorado
- Placeholder con texto muted
- Border-radius: `--radius-sm`

#### Badges
- Rating: Círculo dorado con número bold
- Tags: Pill shape con fondo elevado
- Role badges: Color según rol (oro para admin)

### Visual Details
- Grain texture overlay sutil en backgrounds
- Gradiente radial en hero sections
- Decorative lines doradas como separadores
- Sombra cinematográfica en elementos elevados

---

## 4. Architecture

### Backend (Clean Architecture)
```
src/
├── routes/           → Endpoints HTTP
├── controllers/     → Lógica de request/response
├── services/        → Lógica de negocio
├── repositories/    → Acceso a datos via Prisma
├── models/           → Entidades y tipos TypeScript
├── middlewares/      → Auth, validation, errors
├── config/          → Configuración
├── utils/           → Helpers
└── database/        → Prisma client
```

### Frontend (Feature-based)
```
src/
├── features/
│   ├── auth/        → Autenticación
│   ├── movies/      → Catálogo y detalles
│   ├── favorites/  → Favoritos
│   ├── reviews/     → Reseñas
│   └── admin/      → Panel admin
├── shared/
│   ├── components/ → Componentes reutilizables
│   ├── hooks/       → Hooks personalizados
│   ├── utils/       → Utilidades
│   └── types/       → Tipos compartidos
├── layouts/         → Layouts de página
├── pages/           → Páginas principales
└── App.tsx         → Entry point
```

---

## 5. Database Schema (Prisma)

### Tables

```prisma
model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  passwordHash String
  username     String
  role         Role       @default(USER)
  isBanned     Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  favorites    Favorite[]
  reviews      Review[]
  adminLogs    AdminLog[]
}

enum Role {
  USER
  ADMIN
}

model Favorite {
  id        Int      @id @default(autoincrement())
  userId    Int
  movieId   Int       // TMDB movie ID
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  movieId   Int       // TMDB movie ID
  content   String
  rating    Int       // 1-5
  isHidden  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}

model AdminLog {
  id            Int      @id @default(autoincrement())
  adminId       Int
  action        String
  targetUserId  Int?
  createdAt     DateTime @default(now())
  admin         User     @relation(fields: [adminId], references: [id])
}
```

---

## 6. API Endpoints

### Endpoints Públicos

| Method | Route | Description |
|--------|-------|-------------|
| POST | /auth/register | Registrar nuevo usuario |
| POST | /auth/login | Iniciar sesión |
| POST | /auth/logout | Cerrar sesión |
| GET | /auth/me | Obtener usuario actual |
| GET | /movies | Obtener catálogo (paginado) |
| GET | /movies/search | Buscar películas |
| GET | /movies/:id | Obtener detalle de película |
| GET | /movies/:id/reviews | Obtener reseñas de película |

### Endpoints PRIVADOS (Usuario)

| Method | Route | Description |
|--------|-------|-------------|
| POST | /favorites/:movieId | Agregar a favoritos |
| DELETE | /favorites/:movieId | Quitar de favoritos |
| GET | /favorites | Listar mis favoritos |
| POST | /reviews | Crear reseña |
| PUT | /reviews/:id | Editar mi reseña |
| DELETE | /reviews/:id | Eliminar mi reseña |

### Endpoints PRIVADOS (Admin)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /admin/users | Listar usuarios |
| PUT | /admin/users/:id/ban | Banear usuario |
| PUT | /admin/users/:id/unban | Unbanear usuario |
| PUT | /admin/users/:id/grant-admin | Otorgar rol admin |
| DELETE | /admin/reviews/:id | Eliminar cualquier reseña |
| PUT | /admin/reviews/:id | Modificar cualquier reseña |
| GET | /admin/logs | Ver logs de actividad |
| GET | /admin/stats | Estadísticas |

---

## 7. Authentication & Authorization

### JWT
- Token almacenado en cookie HttpOnly
- Cookie con flags: `HttpOnly`, `Secure` (prod), `SameSite=strict`
- Duración: 7 días

### Roles
- **USER**: Catálogo, búsqueda, favoritos propios, reseñas propias
- **ADMIN**: Todas las funciones de USER + gestión usuarios, gestión reseñas, logs

### Rutas Protegidas
- Middleware `authMiddleware` verifica JWT
- Middleware `adminMiddleware` verifica rol admin

---

## 8. Validation

### Backend
- **Zod** para validación de entrada en todos los endpoints
- Schemas definidos en `models/` o directamente en controllers

### Frontend
- **React Hook Form** + **Zod** para formularios
- Validación en tiempo real
- Mensajes de error por campo

---

## 9. External Integrations

### TMDB API
- Endpoint base: `https://api.themoviedb.org/3`
- Endpoints utilizados:
  - `/movie/popular` - Catálogo popular
  - `/search/movie` - Búsqueda
  - `/movie/{id}` - Detalle
  - `/movie/{id}/credits` - Reparto
  - `/movie/{id}/reviews` - Reseñas TMDB
- Imagenes: `https://image.tmdb.org/t/p/`

---

## 10. Implementation Phases

### Fase 1: Catálogo y Búsqueda
1. Setup backend + frontend
2. Conexión TMDB
3. Endpoints movies
4. UI catálogo y búsqueda
5. Página detalle

### Fase 2: Autenticación y Favoritos
1. Prisma setup + modelos
2. Auth endpoints
3. UI login/register
4. Favoritos endpoints y UI
5. Botón favorite en detalle

### Fase 3: Reseñas
1. Reviews endpoints
2. UI crear/editar reseña
3. Lista de reseñas en detalle

### Fase 4: Admin
1. Endpoints admin
2.seed primer admin
3. UI panel admin

### Fase 5: PWA
1. Service worker
2. Manifest
3. Offline support

---

## 11. Frontend Implementation Guidelines

### Usar Skill frontend-design
Para implementar el frontend, cargar la skill `frontend-design` que provee instrucciones detalladas para crear interfaces distintivas y de grado producción.

### Principios Clave
- Elegir dirección estética bold y ejecutarla con precisión
- Tipografía distintiva (no genéricas)
- Paleta cohesiva con acentos marcados
- Motion estratégico (no scatter)
- Layouts inesperados (asimetría, overlap)
- Texturas y profundidad

### Notas de Implementación
- Usar CSS variables para consistencia
- Componentes con estados (hover, focus, disabled, loading)
- Responsive mobile-first
- Accesibilidad (ARIA, focus visible, contraste)

---

## 12. Code Standards

### TypeScript
- Modo estric strict habilitado
- Tipado explícito en todas las funciones
- Sin `any`

### Comentarios
- JSDoc en funciones exportadas
- Explicar lógica de negocio compleja
- Documentar decisiones de diseño

### Swagger (swagger-jsdoc)
- Anotaciones JSDoc en rutas
- Descripciones y ejemplos
- Tags para agrupar
- UI en /api-docs

---

## 13. Environment Variables

### Backend (Docker development)
```
DATABASE_URL=postgresql://visionmax:visionmax_secret_password@postgres:5432/visionmax
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=7d
TMDB_API_KEY=your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb. org/3
TMDB_IMAGE_URL=https://image. themoviedb.org/t/p
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Backend (production)
```
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=<env>
JWT_EXPIRES_IN=7d
TMDB_API_KEY=<env>
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_URL=https://image.tmdb.org/t/p
PORT=3
NODE_ENV=production
FRONTEND_URL=<production-url>
```

### Frontend
```
VITE_API_URL=http://localhost:3
VITE_TMDB_IMAGE_URL=https://image.themoviedb.org/t/p
```

---

## 14. Acceptance Criteria

### Must Have
- [ ] Catálogo de películas desde TMDB
- [ ] Búsqueda y filtrado
- [ ] Detalle de película
- [ ] Registro y login de usuarios
- [ ] Agregar/quitar favoritos
- [ ] Crear reseñas
- [ ] Panel admin
- [ ] PWA instalable

### Should Have
- [ ] Documentación Swagger accesible
- [ ] Rate limiting
- [ ] Offline para catálogo

### Nice to Have
- [ ] Dashboard estadísticas
- [ ] Logs de actividad
- [ ] Refresco automático de favoritos