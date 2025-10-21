# Architecture Overview

## System Architecture

Clipper is built as a modern web application with a clear separation between frontend and backend components.

### High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  React Frontend │
│   (Vite + TS)   │
└────────┬────────┘
         │
         │ REST API
         ▼
┌─────────────────┐
│   Go Backend    │
│   (Gin + JWT)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌────────┐
│PostgreSQL│ │ Redis  │
└─────────┘ └────────┘
```

## Components

### Frontend (React + TypeScript)

**Technology Stack:**
- React 19 with hooks
- TypeScript for type safety
- Vite for fast development and builds
- TailwindCSS for styling
- React Router for client-side routing
- TanStack Query for server state management
- Zustand for client state management
- Axios for HTTP requests

**Key Features:**
- Component-based architecture
- Server-side state synchronization
- Responsive design
- Dark mode support
- Real-time updates

**Directory Structure:**
```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── services/       # API service layer
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── stores/         # Zustand state stores
```

### Backend (Go)

**Technology Stack:**
- Go 1.24+
- Gin web framework
- pgx for PostgreSQL
- go-redis for Redis
- golang-jwt for authentication
- godotenv for configuration

**Key Features:**
- RESTful API design
- JWT-based authentication
- Middleware for logging, CORS, auth
- Repository pattern for data access
- Service layer for business logic

**Directory Structure:**
```
backend/
├── cmd/api/           # Application entry point
├── internal/
│   ├── handlers/      # HTTP request handlers
│   ├── models/        # Domain models
│   ├── repository/    # Data access layer
│   ├── services/      # Business logic
│   └── middleware/    # HTTP middleware
├── pkg/utils/         # Shared utilities
└── config/            # Configuration management
```

### Database (PostgreSQL)

**Purpose:**
- Persistent storage for all application data
- User accounts and profiles
- Clips metadata and collections
- Comments and reactions

**Key Tables:**
- `users` - User accounts and profiles
- `clips` - Twitch clip metadata
- `collections` - User-created clip collections
- `comments` - User comments on clips
- `tags` - Clip categorization

### Cache (Redis)

**Purpose:**
- Session storage
- API response caching
- Rate limiting
- Real-time features (future)

**Use Cases:**
- Cache Twitch API responses
- Store user sessions
- Implement rate limiting
- Cache frequently accessed data

## API Design

### REST API Structure

All API endpoints are versioned and prefixed with `/api/v1`:

```
/api/v1/
  ├── /auth
  │   ├── POST /login
  │   ├── POST /logout
  │   └── GET  /twitch/callback
  ├── /clips
  │   ├── GET    /clips
  │   ├── GET    /clips/:id
  │   ├── POST   /clips
  │   └── DELETE /clips/:id
  ├── /collections
  │   ├── GET    /collections
  │   ├── POST   /collections
  │   ├── GET    /collections/:id
  │   ├── PUT    /collections/:id
  │   └── DELETE /collections/:id
  └── /users
      ├── GET    /users/:id
      └── PUT    /users/:id
```

### Authentication Flow

1. User clicks "Login with Twitch"
2. Frontend redirects to Twitch OAuth
3. Twitch redirects back with code
4. Backend exchanges code for Twitch token
5. Backend creates JWT and returns to frontend
6. Frontend stores JWT in localStorage
7. Frontend includes JWT in Authorization header

### Request/Response Format

**Request:**
```
GET /api/v1/clips?page=1&limit=20
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid page parameter",
    "details": {}
  }
}
```

## Data Flow

### Clip Discovery Flow

1. User opens frontend application
2. Frontend requests clips from backend
3. Backend checks Redis cache
4. If cache miss, backend queries PostgreSQL
5. Backend returns clips to frontend
6. Frontend displays clips with TanStack Query
7. TanStack Query handles caching and updates

### Authentication Flow

1. User initiates Twitch login
2. Backend generates OAuth state token
3. User authorizes on Twitch
4. Twitch redirects with authorization code
5. Backend exchanges code for access token
6. Backend creates user session
7. Backend generates and returns JWT
8. Frontend stores JWT for subsequent requests

## Security Considerations

- All passwords are hashed using bcrypt
- JWTs are signed with secret key
- CORS configured for frontend origin
- Rate limiting on API endpoints
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via React's automatic escaping

## Performance Optimization

- Redis caching for frequently accessed data
- Database indexing on common queries
- Lazy loading of images
- Code splitting in frontend
- Gzip compression on API responses
- CDN for static assets (production)

## Scalability

The architecture is designed to scale horizontally:

- Stateless backend servers (scale with load balancer)
- Shared PostgreSQL database (can be replicated)
- Shared Redis cache (can be clustered)
- Frontend served from CDN

## Future Enhancements

- WebSocket support for real-time features
- Microservices architecture for specific features
- GraphQL API option
- Message queue for async processing
- Elasticsearch for advanced search
- CDN integration for media files
