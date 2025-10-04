# Image Converter

A modern, high-performance image conversion application built with React, TypeScript, and Vite.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Infrastructure**: Docker + Nginx
- **Image Processing**: Web Workers (client-side)

## Prerequisites

- [Docker](https://www.docker.com/get-started) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- [Node.js](https://nodejs.org/) (v20+) - for local development

## Quick Start

### Development Mode

1. Clone the repository:
```bash
git clone <repository-url>
cd img-converter
```

2. Start the development environment:
```bash
docker-compose up
```

3. Access the application at http://localhost:3000

### Production Mode

Build and run the production environment:
```bash
docker-compose -f docker-compose.prod.yml up --build
```

Access the application at http://localhost

## Project Structure

```
img-converter/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/            # Utility functions
│   │   ├── workers/        # Web Workers for image processing
│   │   ├── App.tsx         # Root component
│   │   └── main.tsx        # Entry point
│   ├── Dockerfile          # Multi-stage frontend build
│   ├── vite.config.ts      # Vite configuration
│   └── package.json
│
├── docker-compose.yml       # Development compose
├── docker-compose.prod.yml  # Production compose
├── nginx.conf              # Nginx configuration for production
└── README.md
```

## Development

### Local Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Hot Reload

The frontend supports hot-reload in Docker with Vite HMR and polling enabled for Docker compatibility.

### Code Quality

**Linting:**
```bash
cd frontend
npm run lint
```

**Formatting:**
```bash
cd frontend
npx prettier --write .
```

## Environment Variables

### Frontend (.env.development / .env.production)
- `NODE_ENV` - Environment mode (development/production)

## Docker Images

The project uses multi-stage builds to optimize image sizes:

- **Frontend Production**: ~50MB (nginx:alpine + built assets)

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Web Workers** - Client-side image processing
- **ESLint + Prettier** - Code quality

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Static file serving (production)
- **Docker Compose** - Container orchestration

## Success Criteria ✓

- [x] `docker-compose up` starts the frontend
- [x] Frontend accessible at http://localhost:3000
- [x] Hot-reload works in Docker
- [x] TypeScript strict mode enabled
- [x] Production build completes successfully
- [x] Container image < 100MB

## Features

This is a client-side image converter that processes images entirely in the browser using Web Workers:
- Client-side image processing (no server uploads required)
- Web Worker-based conversion for performance
- Multiple image format support
- Modern React UI with TypeScript

## License

MIT
