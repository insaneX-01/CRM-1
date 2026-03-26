# Dealer CRM System

Production-ready CRM system for dealer operations, lead management, orders, payments, complaints, schemes, sales operations, and dashboard analytics.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: MongoDB

## Features

- Authentication and role management
- Dealer management
- Lead capture, assignment, status tracking, notes, and exports
- Order management with payment status sync
- Ledger and payment tracking
- Complaint/support handling
- Sales team module
- Dashboard and analytics
- Scheme and incentive management

## Project Structure

- `client` - React frontend
- `server` - Express API and MongoDB models

## Setup

### 1. Install dependencies

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

Create `server/.env` with values like:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/dealer-crm
JWT_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:5173
```

### 3. Seed sample data

```bash
cd server
npm run seed
```

Sample users:

- `admin@techfanatics.com / Admin@123`
- `dealer@techfanatics.com / Dealer@123`
- `sales@techfanatics.com / Sales@123`

### 4. Run the backend

```bash
cd server
npm run dev
```

### 5. Run the frontend

```bash
cd client
npm run dev
```

## Health Check

- `GET /healthz`

## Submission Notes

- The app now includes linked profile creation during registration for dealer and salesperson accounts.
- Payment and order access are role-scoped.
- Outstanding balances update automatically after payments.
