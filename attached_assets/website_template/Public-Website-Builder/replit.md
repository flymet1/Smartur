# Smartur Public Website - Reservation Platform

## Overview
A multi-tenant reservation website for travel agencies built with React, TypeScript, and Express. Designed to integrate with the Smartur API for managing activities, reservations, and agency information.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn/UI components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **i18n**: react-i18next (TR, EN, DE, RU)
- **SEO**: react-helmet-async
- **Backend**: Express.js with in-memory storage (mock data)

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── layout/           # Header, Footer, Layout
│   │   ├── ui/               # Shadcn UI components
│   │   ├── ActivityCard.tsx  # Activity card component
│   │   └── SEO.tsx           # SEO meta tags component
│   ├── pages/
│   │   ├── Home.tsx          # Homepage with hero, featured activities
│   │   ├── Activities.tsx    # Activities list with filters
│   │   ├── ActivityDetail.tsx # Activity detail with booking
│   │   ├── Reservation.tsx   # Multi-step reservation flow
│   │   ├── TrackReservation.tsx # Reservation tracking
│   │   └── Contact.tsx       # Contact form and info
│   ├── lib/
│   │   ├── i18n.ts           # i18n configuration
│   │   ├── queryClient.ts    # React Query client
│   │   └── utils.ts          # Utility functions
│   └── App.tsx               # Main app with routing
server/
├── routes.ts                 # API endpoints
├── storage.ts                # In-memory storage with mock data
└── index.ts                  # Express server setup
shared/
└── schema.ts                 # Zod schemas and TypeScript types
```

## API Endpoints
- `GET /api/agency` - Agency information
- `GET /api/categories` - Activity categories
- `GET /api/activities` - All activities (optional `?featured=true`)
- `GET /api/activities/:slug` - Activity details
- `GET /api/availability/:slug/:date` - Availability slots
- `POST /api/reservations` - Create reservation
- `GET /api/reservations/:code` - Get reservation by tracking code
- `POST /api/contact` - Submit contact form

## Features
- Multi-language support (Turkish, English, German, Russian)
- Responsive design with mobile-first approach
- Activity filtering by category, price range
- Calendar-based date/time slot selection
- Multi-step reservation flow
- Reservation tracking by code
- SEO optimized with Open Graph meta tags
- WhatsApp integration for contact

## Development
The application runs on port 5000. Start with:
```bash
npm run dev
```

## Future Integration
The platform is designed to integrate with Smartur API:
- Replace mock data in `server/storage.ts` with API calls
- Use `X-Agency-Key` header for multi-tenant support
- Environment variable `SMARTUR_API_URL` for API base URL
