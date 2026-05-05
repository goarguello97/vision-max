# Visión Max - Catálogo de Películas

Plataforma cinematográfica premium para explorar, guardar y reseñar películas usando la API de TMDB.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | Express + Prisma + TypeScript |
| Frontend | React + Vite + TypeScript |
| DB | PostgreSQL |
| Auth | JWT (HttpOnly cookies) |
| Validación | Zod |
| API Externa | TMDB |

---

## Requisitos Previos

- Node.js 18+, PostgreSQL 16+, Docker (opcional)
- API Key de TMDB ([obtener](https://www.themoviedb.org/settings/api))

---

## Instalación

```bash
# Backend
cd backend && npm install
cp .env.example .env  # Configurar variables
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Frontend
cd ../frontend && npm install
cp .env.example .env  # Configurar VITE_API_URL
```

---

## Scripts

### Backend (`backend/`)
```bash
npm run dev              # Desarrollo (puerto 3000)
npm run build            # Compilar
npm run start            # Producción
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Migraciones
npm run prisma:seed      # Poblar DB
```

### Frontend (`frontend/`)
```bash
npm run dev      # Desarrollo (puerto 5173)
npm run build    # Compilar producción
npm run lint     # ESLint
```

### Docker
```bash
docker compose up -d       # Iniciar DB + API
docker compose logs -f api  # Ver logs
```

---

## Variables de Entorno

### Backend
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/visionmax
JWT_SECRET=tu-secret-256-bits
JWT_EXPIRES_IN=7d
TMDB_API_KEY=tu-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_URL=https://image.tmdb.org/t/p
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend
```env
VITE_API_URL=http://localhost:3000
VITE_TMDB_IMAGE_URL=https://image.tmdb.org/t/p
```

---

## Arquitectura

### Backend (Clean Architecture)
```
src/
├── routes/          # Endpoints HTTP
├── controllers/     # Lógica request/response
├── services/        # Lógica de negocio
├── repositories/    # Acceso a datos (Prisma)
├── models/          # Tipos y esquemas Zod
├── middlewares/     # Auth, validación, errores
├── config/          # Configuración
└── utils/           # Helpers (jwt, bcrypt, logger)
```

### Frontend (Feature-based)
```
src/
├── features/        # auth, movies, favorites, reviews, admin
├── shared/
│   ├── components/  # UI reutilizable
│   ├── hooks/       # Hooks personalizados
│   └── utils/       # Cliente API, helpers
├── layouts/         # Layouts de página
└── pages/          # Componentes de ruta
```

---

## API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Registrar | No |
| POST | `/auth/login` | Login | No |
| POST | `/auth/logout` | Logout | Sí |
| GET | `/auth/me` | Usuario actual | Sí |
| GET | `/movies` | Catálogo | No |
| GET | `/movies/search` | Buscar | No |
| GET | `/movies/:id` | Detalle | No |
| POST | `/favorites/:movieId` | Agregar favorito | Sí |
| DELETE | `/favorites/:movieId` | Quitar favorito | Sí |
| POST | `/reviews` | Crear reseña | Sí |
| PUT | `/reviews/:id` | Editar reseña | Sí |
| GET | `/admin/users` | Listar usuarios | Admin |
| PUT | `/admin/users/:id/ban` | Banear | Admin |

Swagger docs: `/api-docs`

---

## Diseño

### Colores
```css
--color-bg-primary: #0a0a0f;      /* Negro profundo */
--color-accent-gold: #d4af37;      /* Dorado */
--color-text-primary: #f5f5f0;    /* Blanco cálido */
--color-error: #c41e3a;            /* Rojo cine */
```

### Tipografía
- **Display**: Bebas Neue
- **Headings**: Cormorant Garamond
- **Body**: Source Sans 3

### Motion
- Transiciones: mínimo 200ms ease-out
- Page load: fade + translateY escalonado
- Hover: scale 1.02-1.05 + glow

---

## Características

- Catálogo TMDB con búsqueda
- Autenticación JWT (cookies HttpOnly)
- Favoritos y reseñas (1-5 estrellas)
- Panel admin (ban usuarios, gestión reseñas, logs)
- PWA instalable