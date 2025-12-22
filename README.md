# Olivia

A lightweight chat assistant application (CohortGPT) that combines a React + Vite frontend with an Express + Node backend, using vector search (Pinecone), embedding and generative APIs for intelligent responses, and real-time features via Socket.IO. This repository contains both the frontend and backend code to build, run and deploy the app.

---

## 🚀 Features

- **User authentication** (register, login, logout)
- **Chat management**: create, list, rename, delete chats
- **Message storage** with MongoDB and vector indexing (Pinecone)
- **Embeddings & Generative** calls via GROQ / Cohere / external models
- **Real-time communication** using Socket.IO
- Easy local development with separate frontend and backend servers

---

## 🧭 Architecture Overview

- Frontend: React (Vite) — SPA UI, socket client, API client
- Backend: Node.js, Express — REST API, auth, socket server
- Database: MongoDB (Mongoose)
- Vector Search: Pinecone
- Real-time: Socket.IO

---

## ⚙️ Tech Stack

- Node.js (>=18)
- Express
- React + Vite
- MongoDB (Mongoose)
- Pinecone
- Socket.IO
- GROQ / Cohere / Transformer models (configurable)

---

## 💻 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or cloud)
- Pinecone account and API key
- (Optional) GROQ / other model API keys

### Backend

1. Open a terminal and install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/` with the following variables (example):

```bash
PORT=3000
MONGO_URL=mongodb://localhost:27017/olivia
JWT_SECRET=your_jwt_secret
PINECONE_API_KEY=your_pinecone_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant  # optional
FRONTEND_URLS=http://localhost:5173
NODE_ENV=development
```

3. Start the backend in development:

```bash
npm run dev
```

Start the production server with:

```bash
npm start
```

### Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create a `.env` in `frontend/` or set environment variables for Vite:

```bash
VITE_API_URL=http://localhost:3000
```

3. Run the frontend dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

---

## 📡 API & Socket Notes

- Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/logout`
- Chats: `POST /api/chats`, `GET /api/chats`, `GET /api/chats/:chatId/messages`, `PUT /api/chats/:chatId/rename`, `DELETE /api/chats/:chatId`
- Socket.IO client connects to `VITE_API_URL` and uses credentials (cookies) for auth; ensure `FRONTEND_URLS` is set in backend to allow CORS/sockets.

---

## 🧪 Tests & Utilities

- Backend: `npm run test-embed` (quick embedding test script)
- Frontend linting: `npm run lint` (from `frontend/`)

---

## 👩‍💻 Contributing

Contributions, bug reports and improvements are welcome. Please open issues or pull requests and add clear descriptions and steps to reproduce.

---

## 📄 License

This project is provided under the **MIT License**. See the `LICENSE` file for details.

---

## ✉️ Contact

If you have questions, reach out to the project maintainer listed in `frontend/package.json`.

