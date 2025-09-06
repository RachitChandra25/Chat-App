import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";



//controller to sign up a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.json({ success: false, message: "Account already exists" });
    }
    const salt=await bcrypt.genSalt(10);
    const hashedPassword=await bcrypt.hash(password,salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    const token = generateToken(newUser._id);
    res.json({ success: true,userData:newUser,token, message: "Account created successfully"});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message:error.message });
  }
};

//controller to login a user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const userData = await User.findOne({ email });

    if (!userData) {
      return res.json({ success: false, message: "Account does not exist" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    const token = generateToken(userData._id);
    res.json({ success: true, userData, token, message: "Logged in successfully"});
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message:error.message });
  }
};

//controller to check if user is authenticated
export const checkAuth=async(req,res)=>{
    res.json({success:true, user:req.user});
};

//controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;
    console.log(userId)
    let updatedUser;
    console.log(profilePic, bio, fullName)

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message});
  }
};