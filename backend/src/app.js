const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
//const path=require("path")
/* Routes */
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

/* ========================================= */
/* 🔐 CORS CONFIG                            */
/* ========================================= */
app.use(
  cors({
    origin: "http://localhost:5173",  // <-- frontend URL
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
//app.use(express.static(path.join(__dirname,'../public')))

/* ========================================= */
/* 🚦 API ROUTES                             */
/* ========================================= */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);


// app.get("*name",(req,res)=>{
//   res.sendFile(path.join(__dirname,'../public/index.html'))
// })
module.exports = app;
