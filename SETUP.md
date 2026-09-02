# Setup Instructions

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/cohort-2026/event-management-system.git
cd event-management-system
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

The backend will run at `http://localhost:5000`

To verify it's working, visit `http://localhost:5000/api/health` — you should see:
```json
{ "success": true, "message": "API is working" }
```

---

## 3. Frontend Setup

Open a new terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173`

---

## Environment Variables

| Variable | Description          | Default |
|----------|----------------------|---------|
| `PORT`   | Backend server port  | `5000`  |

---

## Available Scripts

### Backend (`/backend`)

| Script        | Description                        |
|---------------|------------------------------------|
| `npm run dev` | Start dev server with hot reload   |
| `npm run build` | Compile TypeScript to `dist/`    |
| `npm start`   | Run compiled production build      |

### Frontend (`/frontend`)

| Script          | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start Vite dev server              |
| `npm run build` | Build for production               |
| `npm run preview` | Preview production build         |
| `npm run lint`  | Run ESLint                         |
