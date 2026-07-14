import jwt from "jsonwebtoken";
 //function to create token for a user
 export const generateToken=(userID)=>{
    const token=jwt.sign({userID},process.env.JWT_SECRET);
    return token;
 }