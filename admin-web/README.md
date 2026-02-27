# Restaurant Admin Panel

A modern web admin panel for managing the restaurant delivery system.

## Features

- **Dashboard**: Overview with statistics and charts
- **Orders Management**: View, filter, update status, assign delivery men
- **Clients Management**: View all clients and their order history
- **Delivery Men Management**: Add, edit, activate/deactivate delivery personnel
- **Categories Management**: CRUD operations for product categories
- **Products Management**: Full product management with images and promo codes
- **Notifications**: Send push notifications to all users or individual users
- **Settings**: Admin profile and system information

## Tech Stack

- React 18
- Vite
- React Router
- TailwindCSS
- Zustand (State Management)
- Axios
- Recharts (Charts)
- Lucide React (Icons)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Configuration

The admin panel connects to the backend API at `https://haba-haba-api.ubua.cloud/api/admin`.

Make sure the backend server is running before starting the admin panel.

## Creating Admin Account

To create an admin account, run:

```bash
cd backend
npm run create-admin
```

Or with custom credentials:
```bash
npm run create-admin "Admin Name" "admin@email.com" "password123" "super_admin"
```

Default credentials:
- Email: `admin@restaurant.com`
- Password: `Admin123!`

## Environment

The admin panel runs on port 3000 by default (configured in `vite.config.js`).

## API Endpoints

All API calls are made to `/api/admin/*` endpoints, which are proxied to `https://haba-haba-api.ubua.cloud` during development.

