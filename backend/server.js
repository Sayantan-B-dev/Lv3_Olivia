require('dotenv').config()
const app=require("./src/app")
const connectDB=require('./src/db/db')
const port = process.env.PORT || 3000

const initSocketServer=require("./src/sockets/socket.server")
const httpServer=require("http").createServer(app)

connectDB()
initSocketServer(httpServer)

httpServer.listen(port,()=>{
    console.log("server on ",port)
})