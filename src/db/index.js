import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async()=>{
    try{
        const url=`${process.env.MONGODB_URL}/${DB_NAME}`;
        console.log(url);
       const connectionInstance= await mongoose.connect(url)
       console.log(`\n MongoDB connected !! DB HOST:
        ${connectionInstance.connection.host}`);
    }catch(error){
        console.log("MONGODB connection FAILED",error);
        process.exit(1)
    }
}

export default connectDB