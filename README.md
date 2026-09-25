# InvestIQ — AI Investment Research Platform for Indian Equities

> A full-stack investment research platform for Indian stocks combining live NSE market data, AI-generated company briefs, technical signal analysis, and financial performance tracking.

**Tagline:** *Search a ticker. Get a verdict — backed by data, not vibes.*

---

## 🏗️ System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   React/Vite    │────▶│  Express Backend │────▶│   MongoDB Atlas    │
│   Frontend      │     │   (Port 5000)    │     │   (Persistent)     │
└─────────────────┘     └────────┬─────────┘     └────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌───────────┐ ┌──────────┐
              │   NSE    │ │ FastAPI   │ │  Groww   │
              │  (stock- │ │  Python   │ │  (Finan- │
              │ nse-india)│ │ (yfinance)│ │  cials)  │
              └──────────┘ └───────────┘ └──────────┘
```

**Tech Stack:**
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Clerk Auth, React Router
- **Backend:** Node.js, Express, MongoDB/Mongoose, Helmet, CORS
- **Data Service:** Python, FastAPI, yfinance, pandas, scikit-learn
- **External APIs:** NSE India (stock-nse-india), Groww, OpenAI (optional)

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Live NSE Data** | Real-time prices via `stock-nse-india`, fallback to yfinance |
| **Technical Signal Engine** | SMA50/200, RSI-14, 5yr CAGR, sector-relative P/E → BUY/HOLD/AVOID |
| **AI Company Briefs** | Structured summaries via OpenAI (with local fallback) |
| **90-Day Predictions** | LinearRegression on 5yr close prices with R² score |
| **Financial Performance** | Quarterly/yearly revenue & profit, fundamentals, shareholding |
| **Watchlist** | Multi-list watchlist with real-time signals, sparklines, 52W range |
| **Multi-layer Caching** | In-memory → MongoDB (15min TTL) → external providers |
| **Resilient Fallbacks** | Graceful degradation when any provider fails |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (local or Atlas)
- Optional: OpenAI API key for AI summaries

### Local Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd InvestIQ-

# Install all dependencies
npm run install:all

# Install Python data service dependencies
cd data-service && pip install -r requirements.txt && cd ..

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start MongoDB (if local)
mongod

# Seed database with top NSE stocks (optional)
npm run seed

# Start all services
# Terminal 1: Python data service
cd data-service && uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2: Express backend
npm run dev:backend

# Terminal 3: Frontend
npm run dev:frontend
```

### Environment Variables

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
MONGO_URI=mongodb://localhost:27017/investiq
PYTHON_DATA_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
NSE_CACHE_TTL_SECONDS=900
AI_CACHE_TTL_SECONDS=21600
HISTORY_CACHE_TTL_SECONDS=900
REQUEST_TIMEOUT_MS=15000
PYTHON_REQUEST_TIMEOUT_MS=30000
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/ready` | Readiness check (DB + Python service) |
| GET | `/api/version` | API version info |
| GET | `/api/stocks/:ticker` | Full stock profile + signal |
| GET | `/api/stocks/:ticker/history` | 5-year price history |
| GET | `/api/stocks/:ticker/prediction` | 90-day price prediction |
| GET | `/api/stocks/:ticker/ai-summary` | AI-generated company brief |
| GET | `/api/stocks/:ticker/financials` | Financials, fundamentals, shareholding |

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-25T...",
    "cached": false,
    "stale": false
  }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "status": 404,
  "requestId": "..."
}
```

---

## 🧪 Testing

```bash
# Backend tests
npm run test:backend

# Frontend tests (if configured)
npm run test:frontend
```

---

## 🚢 Render Deployment

### Backend (Web Service)
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment Variables:** See `render.yaml`

### Python Data Service (Web Service)
- **Root Directory:** `data-service`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`

### Frontend (Vercel)
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variable:** `VITE_API_BASE_URL=https://your-backend.onrender.com/api`

---

## 📁 Project Structure

```
InvestIQ-/
├── backend/
│   ├── config/
│   │   ├── db.js           # MongoDB connection with retry
│   │   └── env.js          # Centralized config
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── requestLogger.js
│   │   └── validation.js
│   ├── models/
│   │   └── Stock.js        # Stock schema with history & predictions
│   ├── routes/
│   │   ├── healthRoutes.js
│   │   └── stockRoutes.js
│   ├── services/
│   │   ├── nseService.js           # NSE data with fallback
│   │   ├── pythonDataService.js    # FastAPI client
│   │   ├── growwService.js         # Financial data
│   │   ├── signalEngine.js         # Technical analysis
│   │   └── aiSummaryService.js     # AI company briefs
│   ├── utils/
│   │   ├── normalizeTicker.js
│   │   ├── safeNumber.js
│   │   ├── timeout.js
│   │   └── response.js
│   ├── tests/
│   ├── server.js
│   ├── seed.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── data/
│   └── package.json
├── data-service/
│   ├── app.py              # FastAPI service
│   └── requirements.txt
├── render.yaml             # Render deployment config
└── package.json            # Root scripts
```

---

## ⚠️ Important Notes

- **No Fake Data:** Never returns fabricated stock prices or financial figures
- **Graceful Degradation:** Returns stale cached data with `stale: true` metadata when providers fail
- **Rate Limits:** Respects provider limits with timeouts and retries
- **Security:** API keys only on backend, Helmet headers, restricted CORS
- **Investment Disclaimer:** All signals and predictions are algorithmic estimates, not financial advice

---

## 📄 License

This project is developed as an academic/personal project.