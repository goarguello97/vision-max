# AGENTS.md - Visión Max

Fullstack PWA for movie catalog using TMDB API. Stack: Express + Prisma (backend), React + Vite + TypeScript (frontend).

---

## Build Commands

### Frontend (`frontend/`)
```bash
npm run dev      # Dev server (port 5173)
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint strict
```

### Backend (`backend/`)
```bash
npm run dev              # ts-node-dev hot reload (port 3000)
npm run build            # TypeScript compilation
npm run start            # Production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
```

### Docker
```bash
docker compose up -d      # PostgreSQL + API
docker compose logs -f api # View API logs
```

---

## Code Style

### TypeScript
- **Strict mode** in all tsconfig files
- **No `any`** - use `unknown` when type is unknown
- **Explicit return types** on all exported functions
- **Interface over type** for object shapes

### Imports
- **Absolute** from `src/`: `import { Button } from '@/shared/components/Button'`
- **Relative** only for sibling files
- **Order**: external → internal → relative

### Naming Conventions
```
Files:       kebab-case (auth-controller.ts)
Classes:     PascalCase (AuthController)
Functions:   camelCase (getUserById)
Constants:   SCREAMING_SNAKE_CASE (MAX_RETRIES)
Interfaces:  PascalCase prefixed I (IUserResponse)
Enums:       PascalCase (Role values: USER, ADMIN)
```

### Error Handling
```typescript
// Backend
throw AppError.notFound('User not found');

if (error instanceof ZodError) {
  res.status(400).json({ success: false, errors: error.errors });
}

// Frontend
try {
  await api.getUser();
} catch (error) {
  if (isAxiosError(error)) {
    showToast(error.response?.data?.message || 'Error');
  }
}
```

### JSDoc
Required on all exported functions.

### Validation (Zod)
- Schemas in `models/schemas.ts`
- Infer types: `type RegisterInput = z.infer<typeof registerSchema>`

---

## Architecture

### Backend (Clean Architecture)
```
src/
├── routes/          # HTTP endpoints
├── controllers/     # Request/response logic
├── services/        # Business logic
├── repositories/    # Data access (Prisma)
├── models/          # Types, schemas, entities
├── middlewares/     # auth, validation, errors
├── config/          # Environment, swagger
├── utils/           # Helpers (jwt, bcrypt, logger)
└── database/        # Prisma client
```

### Frontend (Feature-based)
```
src/
├── features/        # auth, movies, favorites, reviews, admin
├── shared/
│   ├── components/  # Reusable UI components
│   ├── hooks/       # Custom hooks
│   ├── utils/       # API clients, helpers
│   └── types/       # Shared TypeScript types
├── layouts/         # Page layouts
└── pages/          # Route components
```

---

## API Design

### Response Format
```typescript
{ success: true, data: {...} }           // Success
{ success: false, message: string }     // Error
{ success: false, errors: ZodError[] }   // Validation
```

### Status Codes
- `200` Success, `201` Created, `400` Validation error
- `401` Unauthorized, `403` Forbidden (admin), `404` Not found, `500` Internal error

### Authentication
- JWT in HttpOnly cookie (`token`)
- Flags: `httpOnly: true`, `sameSite: 'strict'`, `secure: true` in production
- 7-day expiration

---

## Database
- **Prisma** with PostgreSQL
- Models: `User`, `Favorite`, `Review`, `AdminLog`
- Run `prisma:generate` after schema changes

---

## External Services
### TMDB API
- Base: `https://api.themoviedb.org/3`
- Images: `https://image.tmdb.org/t/p/`
- Endpoints: `/movie/popular`, `/search/movie`, `/movie/{id}`

---

## Design System

### Colors
```css
--color-bg-primary: #0a0a0f;
--color-accent-gold: #d4af37;
--color-text-primary: #f5f5f0;
```

### Typography
- Display: Bebas Neue
- Headings: Cormorant Garamond
- Body: Source Sans 3

### Motion
- Transitions: minimum 200ms ease-out
- Page load: staggered fade + translateY
- Hover: scale 1.02-1.05 + glow