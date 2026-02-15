# CommercialQ - Tech Stack

## Frontend

### Core Framework & Libraries
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type-safe JavaScript
- **Vite 7.3.0** - Build tool and dev server
- **Wouter 3.3.5** - Lightweight routing

### UI Components & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Headless UI components
  - Dialog, Dropdown, Popover, Select, Tabs, Toast, etc.
- **Lucide React 0.453.0** - Icon library
- **Shadcn/ui** - Component library built on Radix UI

### Animation & Effects
- **GSAP (GreenSock)** - Animation library
- **Three.js 0.170.0** - 3D graphics library
- **Framer Motion 11.18.2** - Animation library
- **Custom Components**:
  - PixelBlast - Interactive pixel background effect
  - TextType - Typing animation effect
  - CardNav - Animated navigation menu

### Data Management
- **TanStack Query 5.60.5** - Data fetching and caching
- **React Hook Form 7.55.0** - Form management
- **Zod 3.24.2** - Schema validation

### Charts & Visualization
- **Recharts 2.15.4** - Chart library

## Backend

### Server Framework
- **Express 5.0.1** - Web server framework
- **Node.js** - Runtime environment
- **TypeScript** - Type-safe backend code

### Session Management
- **Express Session 1.19.0** - Session middleware
- **Custom Auth System** - Simple session-based authentication

### Data Storage
- **In-Memory Storage** - Custom implementation (no database)
  - Products, Sales, Uploads stored in memory
  - Data resets on server restart

### File Upload
- **Multer 2.0.2** - File upload middleware

## Development Tools

### Build & Bundling
- **TSX 4.20.5** - TypeScript execution
- **ESBuild 0.25.0** - Fast JavaScript bundler
- **Vite** - Development server with HMR

### Code Quality
- **TypeScript** - Static type checking
- **PostCSS 8.4.47** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing

## Project Structure

```
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # Shadcn UI components
│   │   │   ├── PixelBlast.tsx
│   │   │   ├── TextType.tsx
│   │   │   ├── CardNav.tsx
│   │   │   └── Layout.tsx
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
│   └── public/           # Static assets
├── server/               # Backend application
│   ├── auth.ts          # Authentication logic
│   ├── memory-storage.ts # In-memory data storage
│   ├── routes.ts        # API routes
│   ├── index.ts         # Server entry point
│   └── vite.ts          # Vite dev server setup
└── shared/              # Shared types and schemas
    ├── schema.ts        # Data models and validation
    └── routes.ts        # API route definitions

```

## Key Features

### Design System
- **Color Palette**: Black, Grey, White, Yellow (#FFD700)
- **Dark Theme**: Black background with yellow accents
- **Typography**: Inter (sans), Outfit (display)

### Interactive Elements
- Animated pixel background (PixelBlast)
- Typing text effect (TextType)
- Expandable card navigation (CardNav)
- Smooth animations with GSAP

### Data Flow
- RESTful API endpoints
- Session-based authentication
- In-memory data storage
- Real-time form validation with Zod

## Performance Optimizations
- Code splitting with Vite
- Lazy loading of routes
- Optimized bundle size
- Fast refresh during development
- Minimal dependencies

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript features
- CSS Grid and Flexbox layouts
