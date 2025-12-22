# Deploying Olivia to Render 🚀

This document explains how to deploy the Olivia frontend (static site) and backend (web service) to Render and the minimal code changes required for a smooth deployment (CORS, ports, sockets, environment variables, and cookies).

---

## 📌 Summary
- Backend: deploy as a **Web Service** (Node). Root dir: `backend`.
- Frontend: deploy as a **Static Site**. Root dir: `frontend`.
- Important env vars: `MONGO_URL`, `JWT_SECRET`, `FRONTEND_URLS`, `VITE_API_URL`, plus any API keys.

---

## 🔧 Required code changes
Make these edits before deploying (or let a CI step run them). They allow dynamic origins, port and cookie options.

### 1) `backend/server.js` — use `PORT`
```diff
- httpServer.listen(3000,()=>{
-     console.log("server on 3000")
- })
+ const PORT = process.env.PORT || 3000;
+ httpServer.listen(PORT, () => {
+   console.log(`server listening on ${PORT}`);
+ });
```

### 2) `backend/src/app.js` — use `FRONTEND_URLS` (comma-separated) and dynamic CORS
```diff
- app.use(
-   cors({
-     origin: "http://localhost:5173",  // <-- frontend URL
-     credentials: true,
-     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
-     allowedHeaders: ["Content-Type", "Authorization"]
-   })
- );
+ const ALLOWED_ORIGINS = (process.env.FRONTEND_URLS || "http://localhost:5173").split(",");
+ app.use(
+   cors({
+     origin: (origin, cb) => {
+       if (!origin) return cb(null, true);
+       if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
+       return cb(new Error("Not allowed by CORS"));
+     },
+     credentials: true,
+     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
+     allowedHeaders: ["Content-Type", "Authorization"]
+   })
+ );
```

### 3) `backend/src/sockets/socket.server.js` — dynamic socket origins
```diff
- const io = new Server(httpServer, {
-   cors: {
-     origin: "http://localhost:5173",
-     credentials: true
-   }
- });
+ const allowed = (process.env.FRONTEND_URLS || "http://localhost:5173").split(",");
+ const io = new Server(httpServer, {
+   cors: {
+     origin: (origin, cb) => {
+       if (!origin || allowed.includes(origin)) return cb(null, true);
+       return cb(new Error("Not allowed by CORS"));
+     },
+     credentials: true
+   }
+ });
```

### 4) `backend/src/controller/auth.controller.js` — secure cookie options
```diff
-    res.cookie("token", token);
+    res.cookie("token", token, {
+      httpOnly: true,
+      secure: process.env.NODE_ENV === "production",
+      sameSite: "none"
+    });
```

### 5) `backend/package.json` — add a `start` script
```diff
  "scripts": {
    "dev": "npx nodemon server.js",
+   "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

### 6) Frontend — use Vite env vars
- `frontend/src/api/axiosClient.js`
```diff
- const api = axios.create({
-   baseURL: "http://localhost:3000/api",
-   withCredentials: true
- });
+ const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
+ const api = axios.create({
+   baseURL: `${base}/api`,
+   withCredentials: true
+ });
```

- `frontend/src/socket.js`
```diff
- export const socket = io("http://localhost:3000", {
+ const socketBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
+ export const socket = io(socketBase, {
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: false
  });
```

> Note: Vite env vars (prefixed with `VITE_`) are *baked into the build*, so set them in Render **before** the build runs.

---

## 🔐 Environment variables
- Backend (Render Web Service environment):
  - `MONGO_URL` — MongoDB connection string
  - `JWT_SECRET` — JWT secret
  - `PINECONE_API_KEY` — Pinecone key (if using)
  - `GROQ_API_KEY` — GROQ key (if using)
  - `FRONTEND_URLS` — comma-separated allowed origins, e.g. `https://olivia-chatbot.onrender.com,http://localhost:5173`
  - `NODE_ENV` — `production`
- Frontend (Render Static Site env -- **must set before build**):
  - `VITE_API_URL` — your backend base URL, e.g. `https://olivia-chatbot.onrender.com`

---

## 🛠 Render setup — Backend (Web Service)
1. Render → **New** → **Web Service** → connect repo
2. Set **Root Directory** to `backend` and pick the branch
3. Build (Render runs `npm install` automatically). Set **Start Command** to `npm start`
4. Add Backend environment variables (see list above)
5. Deploy and copy the service URL (example: `https://<your-backend>.onrender.com`)

## 🧭 Render setup — Frontend (Static Site)
1. Render → **New** → **Static Site** → connect repo
2. Set **Root Directory** to `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. **Before** deployment, add env var: `VITE_API_URL` = `https://<your-backend>.onrender.com`
6. Deploy and copy the site URL (example: `https://olivia-chatbot.onrender.com`)

---

## ✅ Post-deploy checks & troubleshooting
- Cookies: for cross-site cookies ensure `sameSite: 'none'` and `secure: true` in production — check the Set-Cookie header in responses.
- Socket.io: if `connect_error` appears, confirm the frontend origin exactly matches one in `FRONTEND_URLS` including `https://` scheme.
- CORS errors: check backend logs for `Not allowed by CORS` messages and add the exact origin to `FRONTEND_URLS`.
- Missing Vite env: if frontend still uses `localhost`, rebuild the site after setting `VITE_API_URL` in Render.
- Check Render service logs (Dashboard → Service → Logs) for start errors or environment variable issues.

---

## 🧪 Local development notes
- Backend local `.env` (in `backend/`):
```
MONGO_URL=mongodb://...replace...
JWT_SECRET=devsecret
FRONTEND_URLS=http://localhost:5173
```
- Frontend local `.env.local` (in `frontend/`):
```
VITE_API_URL=http://localhost:3000
```
- Run locally:
  - `cd backend && npm run dev`
  - `cd frontend && npm run dev`

---

## ⚡ Next steps (optional)
- I can make these code edits and open a branch/PR for you.
- I can also help configure and deploy the two Render services and verify socket & cookie behavior.

---

If you want me to apply the changes now, say **apply changes** and I'll update the repository and add a PR. Good to go? ✅
