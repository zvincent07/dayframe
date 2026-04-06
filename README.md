# Dayframe

A full-stack journaling and productivity application built with Next.js, TypeScript, MongoDB, and packaged as a desktop executable using Tauri.

## Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router)
- **Desktop Framework**: Tauri v2 (Rust)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **UI**: Tailwind CSS + Shadcn UI
- **Auth**: NextAuth.js v5 (JWT, Google OAuth + Credentials)

## Prerequisites

- **Node.js** (v18+)
- **Rust & Cargo** (Required for Tauri builds)
- **MongoDB** instance (local or Atlas)
- **PM2** (Recommended for local daemon deployment: `npm install pm2 -g`)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm ci
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and configure your MongoDB connection and authentication secrets.
   ```bash
   cp .env.example .env.local
   ```

3. **Run the development server**:
   To start both the Next.js development server and the Tauri desktop window simultaneously:
   ```bash
   npm run tauri:dev
   ```
   *(Alternatively, use `npm run dev` to only run the Next.js web server)*

## Production Deployment Strategy

Dayframe is configured to run its Next.js backend as a local system daemon, with the Tauri desktop application connecting to it seamlessly.

### 1. Start the Backend Daemon
First, build and start the Next.js production server. We recommend using PM2 to manage the background process:
```bash
# Build the Next.js application
npm run build

# Start the application as a background daemon
pm2 start npm --name "dayframe-web" -- run start
```
*The daemon will run on `http://localhost:3000`.*

### 2. Build the Tauri Executable
Once the backend is running, compile the Tauri desktop executable:
```bash
npm run tauri:build
```
You can find the compiled desktop executable in `src-tauri/target/release/`. 

When launched, the desktop app acts as a native wrapper that securely interfaces with your local Next.js daemon.

## Project Structure

- `src/app/`: Next.js App Router pages, layouts, and API routes.
- `src/components/`: React components (UI and Features).
- `src/lib/`: Utility functions, database connection, and auth configurations.
- `src/services/`: Core business logic layer.
- `src/repositories/`: Database access layer.
- `src-tauri/`: Rust-based Tauri configuration and desktop system bindings.
