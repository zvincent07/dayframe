# Dayframe

A SaaS journaling application built with Next.js, TypeScript, and MongoDB.

## Documentation

- [Product Specification](docs/SPECIFICATION.md) - Detailed product goals, architecture, and roadmap.
- [Engineering Rules](.rule) - Core engineering principles and coding standards.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **UI**: Tailwind CSS + Shadcn UI
- **Auth**: NextAuth.js v5 (JWT, Google OAuth + Credentials)
- **Rate Limiting**: Upstash Redis (production) with in-memory fallback for development

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and update the values.
   ```bash
   cp .env.example .env.local
   ```
   In production, set Upstash Redis environment variables to enable robust rate limiting.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/app`: App Router pages and layouts.
- `src/components/ui`: Shared UI components (Shadcn).
- `src/lib`: Utility functions and configuration (MongoDB, Auth).
- `src/services`: Business logic layer.
- `src/repositories`: Database access layer.
- `src/permissions`: Role-based access control definitions.
