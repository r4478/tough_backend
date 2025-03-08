import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


    // Configuration
cloudinary.config({ 

    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
// console.log(cloudinary,process.env.CLOUDINARY_CLOUD_NAME)

const uploadOnCloudinary = async (localFilePath) => {
    try{
       if(!localFilePath) return null

       //Upload file on cloudinary
       const response = await cloudinary.uploader.upload(localFilePath, {
           resource_type: "auto"
       })

       //file has been uploaded successfully
    //    console.log("file is uploaded on cloudinary",
    //    response.url);
       if(fs.existsSync(localFilePath)){
        fs.unlinkSync(localFilePath)
       }
       return response;
    }catch (error){
        console.log(error.message);
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath)
        }  //remove the locally saved temporary as the upload operation got failed
       return null;
    }
}

export {uploadOnCloudinary}
