# Overseas Education CRM

Production-Ready Overseas Education CRM with Clean Enterprise SaaS Interface and Authoritative Backend.

---

## 🚀 Live Deployment on Vercel

Vercel Project: [https://vercel.com/jaiva-creative-labs/overseas-crm](https://vercel.com/jaiva-creative-labs/overseas-crm)

### Architecture on Vercel
- **Frontend**: Vite React SPA served from `frontend/dist` with client-side SPA routing rewrites.
- **Backend API**: Express API executed as a Vercel Serverless Function via `api/index.ts`, handling `/api/*` and connecting to MongoDB Atlas.

---

## ⚙️ Vercel Environment Variables Configuration

In your Vercel Project Settings (**Settings > Environment Variables**), configure the following environment variables:

| Variable Name | Required | Example / Default Value | Description |
|---|---|---|---|
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster0.ryywp2q.mongodb.net/jaiva_crm?retryWrites=true&w=majority` | MongoDB Atlas Connection String |
| `JWT_SECRET` | **Yes** | `overseas_crm_super_secret_jwt_key_2026_change_in_production` | JWT Secret Key for authentication |
| `JWT_EXPIRES_IN` | No | `7d` | JWT Token Expiration duration |
| `NODE_ENV` | No | `production` | Node environment |
| `VITE_API_BASE_URL` | No | `/api/v1` | Custom API base URL (optional, defaults to `/api/v1`) |

---

## 🔑 Default Seeded Demo Credentials

When the database is connected for the first time, it automatically initializes default accounts:

| Role | Email | Password |
|---|---|---|
| **Owner Admin** | `owner@jaivacrm.com` | `Password@123` |
| **Admin** | `admin@jaivacrm.com` | `Password@123` |
| **Senior Counsellor** | `counsellor@jaivacrm.com` | `Password@123` |
| **Student** | `rohan.sharma@example.com` | `Password@123` |

---

## 🛠️ Local Development

### 1. Install all dependencies:
```bash
npm install
```

### 2. Configure Environment:
Copy `.env.example` to `.env` and configure your `MONGODB_URI`:
```bash
cp .env.example .env
```

### 3. Run Development Servers:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api/v1`
- Health check: `http://localhost:5000/health`

### 4. Build for Production:
```bash
npm run build
```
