# Aao Seekhe — AI-Powered Learning Management System

[![Live Demo](https://img.shields.io/badge/Demo-Live_Site-blue?style=for-the-badge&logo=vercel)](https://aaoseekhelive.vercel.app/)

A full-stack LMS platform with AI-driven modules, MCQ workspaces, resume analysis, mock interviews, email generation, and employability tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **AI** | Groq (LLaMA 3.1) |
| **Auth** | Google OAuth 2.0 + JWT |
| **Database** | SQLite (dev) / PostgreSQL (production) |

## Project Structure

```
├── backend/              # Python FastAPI backend
│   ├── app/              # Application code (routes, models, services)
│   ├── alembic/          # Database migrations
│   ├── content/          # Static content files
│   ├── seed_course*.py   # Module quiz seed data
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container
├── src/                  # React frontend source
├── public/               # Static assets (logos, favicons)
├── render.yaml           # Render Blueprint (auto-deploy both services)
├── docker-compose.yml    # Docker local development
├── vercel.json           # Vercel frontend config
├── Dockerfile            # Frontend container (nginx)
└── nginx.conf            # Nginx config for SPA routing
```

---

## Local Development

### Prerequisites
- Node.js 22+
- Python 3.11+

### 1. Frontend
```bash
cp .env.example .env          # Edit with your values
npm install
npm run dev                   # Starts at http://localhost:5173
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # Edit with your Groq key & Google Client ID
python -m venv venv
venv\Scripts\activate         # Windows (or source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload # Starts at http://localhost:8000
```

---

## Deployment

### Option 1: Render (Recommended — Free Tier)

This repo includes a `render.yaml` Blueprint that deploys both frontend and backend automatically.

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Connect your GitHub repo — Render will detect `render.yaml`
4. Set environment variables in the Render dashboard:

**Frontend (`nlm-frontend`):**
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://nlm-backend-xxxx.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

**Backend (`nlm-backend`):**
| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | From [console.groq.com/keys](https://console.groq.com/keys) |
| `SECRET_KEY` | A random 64-character string |
| `DATABASE_URL` | Render PostgreSQL Internal URL |
| `GOOGLE_CLIENT_ID` | Same as frontend |
| `FRONTEND_URL` | `https://nlm-frontend.onrender.com` |
| `CORS_ORIGINS` | `https://nlm-frontend.onrender.com` |

5. Click **Apply** — both services deploy automatically.

### Option 2: Vercel (Frontend) + Render (Backend)

1. Deploy backend on Render as above
2. Import this repo on [Vercel](https://vercel.com/) — it auto-detects `vercel.json`
3. Set `VITE_API_BASE_URL` to your Render backend URL
4. Deploy

### Option 3: Docker Compose (Self-hosted)

```bash
cp .env.example .env
cp backend/.env.example backend/.env
# Edit both .env files with your values
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

---

## Post-Deployment Checklist

- [ ] Update [Google Cloud Console](https://console.cloud.google.com/apis/credentials) OAuth settings:
  - Add your production URL to **Authorized JavaScript origins**
  - Add your production URL to **Authorized redirect URIs**
- [ ] If using Render PostgreSQL, run seed scripts via Render Shell:
  ```bash
  python seed_course1.py && python seed_course2.py && python seed_course3.py && python seed_course4.py
  ```
- [ ] Test Google login flow end-to-end
- [ ] Verify AI tools (Mock Interview, Email Generator) connect to Groq

---

## Environment Variables Reference

### Where to get each key

| Key | Source | Free? |
|-----|--------|-------|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) | ✅ Yes |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID | ✅ Yes |
| `SECRET_KEY` | Generate yourself: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ Yes |
| `DATABASE_URL` | Render Dashboard → New PostgreSQL (use Internal URL) | ✅ Free tier |

---

## License

Private — All rights reserved.
