# PlantSight 🌿

**Smart Plant Monitoring & AI Botanical Diagnosis**

PlantSight is a full-stack IoT and AI-powered plant monitoring application. It streams real-time environmental telemetry (soil moisture, temperature, humidity, and light intensity) from ESP32 microcontrollers, visualizes historical trends, triggers automated threshold alerts, and performs botanical disease diagnosis using the Google Gemini Vision API.

---

## 🏗️ Architecture & Project Structure

The project is cleanly separated into two independent, modular directories: `frontend/` and `backend/`.

```
PlantSight/
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── public/
│   │   └── favicon.svg           # Brand favicon
│   ├── src/
│   │   ├── components/           # Reusable UI components (cards, charts, headers)
│   │   ├── context/              # DataContext provider and state management
│   │   ├── data/                 # Offline sample data fallback
│   │   ├── pages/                # Application routes (Dashboard, Plants, Analysis, etc.)
│   │   ├── services/             # Axios API client and backend service calls
│   │   ├── types/                # TypeScript shared domain interfaces
│   │   ├── utils/                # Chart formatting & date/display utility functions
│   │   ├── App.tsx               # Main application component & route configuration
│   │   ├── main.tsx              # React DOM entry point
│   │   └── index.css             # Tailwind CSS directives and custom classes
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── .env
│
├── backend/                      # Node.js + Express + MongoDB + Gemini AI
│   ├── src/
│   │   ├── config/               # Database (Mongoose) and Cloudinary configuration
│   │   ├── controllers/          # Business logic handlers (plants, sensors, alerts, analysis)
│   │   ├── middleware/           # Centralized error handler and file upload middleware
│   │   ├── models/               # Mongoose schemas (Plant, SensorReading, Alert, Analysis, Settings)
│   │   ├── routes/               # Express route definitions
│   │   ├── scripts/              # Database seeder (`seed.js`) & test suite (`testEndpoints.js`)
│   │   ├── services/             # Gemini AI multimodal service, Cloudinary service, alert evaluator
│   │   └── app.js                # Express app setup, CORS, and route registrations
│   ├── server.js                 # Server entrypoint listening on PORT 5000
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── .gitignore                    # Clean root ignore file (protects secrets & node_modules)
├── package.json                  # Root runner scripts (npm run dev:frontend, npm run dev:backend)
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **MongoDB**: Local MongoDB server running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI

### 2. Install Dependencies
Run in the respective directories:
```bash
# In frontend directory
cd frontend
npm install

# In backend directory
cd ../backend
npm install
```

### 3. Configure Environment Variables

#### Frontend Configuration (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

#### Backend Configuration (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/plantsight
FRONTEND_URL=http://localhost:5173

# Google Gemini API Key (Get free key from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional: Cloudinary credentials for cloud image storage (https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
*(If Cloudinary credentials are left empty, images are safely stored locally in `backend/uploads/`)*

---

## 🏃 Running the Application

### Option A: From Root Directory
```bash
# Terminal 1 — Start Backend Server:
npm run dev:backend

# Terminal 2 — Start Frontend Application:
npm run dev:frontend
```

### Option B: From Individual Subfolders
```bash
# Terminal 1 — Backend:
cd backend
npm run dev

# Terminal 2 — Frontend:
cd frontend
npm run dev
```

- **Frontend URL**: `http://localhost:5173`
- **Backend API URL**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 📡 ESP32 Telemetry Ingestion

ESP32 microcontrollers can post environmental sensor readings directly to:

```http
POST http://<SERVER_IP>:5000/api/sensors/reading
Content-Type: application/json

{
  "plantId": "6ad5a72485e216ed8cfa93da",
  "soilMoisture": 45.2,
  "temperature": 24.5,
  "humidity": 58.0,
  "lightIntensity": 4500
}
```

*For low-memory microcontrollers, simple HTTP GET is also supported:*
```http
GET http://<SERVER_IP>:5000/api/sensors/reading?plantId=6ad5a72485e216ed8cfa93da&soilMoisture=45.2&temperature=24.5&humidity=58.0&lightIntensity=4500
```

---

## 🧪 Testing

```bash
# Run backend API verification test suite (tests health, CRUD, telemetry, Gemini AI):
npm test --prefix backend

# Run frontend TypeScript type checking:
npm run typecheck --prefix frontend

# Build frontend for production:
npm run build --prefix frontend

# Re-seed database with default plants and sensor history:
npm run seed --prefix backend
```

---

## 🔒 Security
- All sensitive API keys (`GEMINI_API_KEY`, Cloudinary secrets) remain exclusively in `backend/.env`.
- Secrets are never exposed to the frontend or printed in server logs.
- `.env` files are ignored by Git. Safe template `.env.example` files are provided.
