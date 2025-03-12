import {asyncHandler} from "../utils/asyncHandler.js";

import {ApiError} from "../utils/ApiError.js"

import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken= async(userId)=>
{
    try{
       const user= await User.findById(userId)
       const accessToken= user.generateAccessToken()
       const refreshToken= user.generateRefreshToken()
       
       user.refreshToken=refreshToken
       await user.save({validateBeforeSave: false})
       //don't go for validation of password and all in user.modes.js
       
       return {accessToken,refreshToken}

    } catch(error){
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

//Register User
const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message: "Ravi Kumar"
    // }) 

//Get user details from frontend
//Validation-not empty
//check if user already exist:username,email
//check for images ,check for avatar
//Upload them to cloudinary,avatar
//create user object-create entry in db
//remove password and refresh token field from response
//check for user creation
//return response

    const {fullName,email,username,password} = req.body
    // console.log("Entities created: ",email,fullName,username,password);

    if(
        [fullName,email,username,password].some(
            (field) => field?.trim() ===""
        )
    ){
        throw new ApiError(400,"All fields are required")
    }


    const existedUser =await User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    // console.log(req.files);
// console.log(existedUser);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath= req.files.coverImage[0].path
    }

    // console.log(avatarLocalPath);
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatarpath file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

//Login User
const loginUser = asyncHandler(async(req,res)=>{
    //req body->data
    //userName or email
    //find the user
    //password check
    //access and refresh token generate
    //send tokens in secure cookies

    const {email,username,password} = req.body
    // console.log(email);

    if(!username && !email){
        throw new ApiError(400, "username or password is required");

    }
    const user= await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"wrong password")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
    
    //To send cookies
    const options ={
        httpOnly:true, //to modify only by server
        secure:true
    }

    return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200, 
                {
                user:loggedInUser,accessToken,refreshToken                
                },
                "User logged in successfully"
            )
        )
  
})

//Logout User
const logoutUser= asyncHandler(async(req,res)=>{
    //Remove cookies
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new: true
        }
    )

    const options ={
        httpOnly:true, //to modify only by server
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {},"User logged out successfully"))
})


const refreshAccessToken= asyncHandler(async(req,res)=>
{
    //from the cookies of user
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        //user.refresh token from database(mongo db)
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }
        
        const options= {
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}= await generateAccessAndRefreshToken(user._id)
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken: newrefreshToken},
                "access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}