const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

/* Routes */
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

/* ========================================= */
/* 🔐 CORS CONFIG                            */
/* ========================================= */
const ALLOWED_ORIGINS = (process.env.FRONTEND_URLS || "http://localhost:5173").split(",");
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ========================================= */
/* 🧩 CORE MIDDLEWARE                        */
/* ========================================= */
app.use(express.json());
app.use(cookieParser());

/* ========================================= */
/* 🚦 API ROUTES                             */
/* ========================================= */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;
