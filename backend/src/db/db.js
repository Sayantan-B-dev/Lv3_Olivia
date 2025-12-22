const mongoose=require("mongoose")

async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URL)
        console.log("connected to DB")
    }catch(e){
        console.log("error connecting to DB",e)
    }
}

module.exports=connectDB