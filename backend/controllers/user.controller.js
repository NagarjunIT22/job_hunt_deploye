import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import mongoose from "mongoose";
// const nodemailer = require('nodemailer');

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp) {
    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP for Account Verification',
        text: `Your OTP is: ${otp}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Account Verification</h2>
                <p>Please use the following OTP to verify your account:</p>
                <div style="background: #f3f4f6; padding: 10px 15px; display: inline-block; 
                    border-radius: 4px; font-size: 24px; font-weight: bold; letter-spacing: 2px; 
                    color: #2563eb; margin: 10px 0;">
                    ${otp}
                </div>
                <p>This OTP is valid for 10 minutes.</p>
                <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
}

export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;
         
        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "All fields are required",
                success: false
            });
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email',
                success: false,
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle file upload if present
        let profilePhoto = '';
        if (req.file) {
            const fileUri = getDataUri(req.file);
            const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
            profilePhoto = cloudResponse.secure_url;
        }

        // Create user with OTP (not verified yet)
        const newUser = await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            otp,
            otpExpiry,
            isVerified: false,
            isOtpVerified: false,
            profile: profilePhoto ? { profilePhoto } : {}
        });

        // Send OTP email
        await sendOTPEmail(email, otp);

        return res.status(201).json({
            message: "OTP sent to your email for verification",
            success: true,
            userId: newUser._id
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            success: false
        });
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        console.log(userId, otp ,"userId, otp ");
        
        if (!userId || !otp) {
            return res.status(400).json({
                message: "User ID and OTP are required",
                success: false
            });
        }

        // Find user with valid OTP
        const user = await User.findOne({
            _id: userId,
            // otpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid user or OTP expired",
                success: false
            });
        }

        console.log("user.opt",user.otp)
        if (user.otp != otp) {
            return res.status(400).json({
                message: "Invalid OTP",
                success: false
            });
        }

        // Verify user
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.isOtpVerified = true;
        await user.save();

        return res.status(200).json({
            message: "Account verified successfully",
            success: true
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

// export const verifyOtp = async (req, res) => {
//     try {
//         const { userId, otp } = req.body;
        
//         console.log('Verification request:', { userId, otp });
        
//         if (!userId || !otp) {
//             return res.status(400).json({
//                 message: "User ID and OTP are required",
//                 success: false
//             });
//         }

//         // Validate userId format
//         if (!mongoose.Types.ObjectId.isValid(userId)) {
//             return res.status(400).json({
//                 message: "Invalid user ID format",
//                 success: false
//             });
//         }

//         // Find user with valid OTP
//         const user = await User.findOne({
//             _id: userId,
//             otp: { $exists: true },
//             otpExpiry: { $gt: Date.now() }
//         });

//         console.log('Found user:', user);
        
//         if (!user) {
//             // More detailed error message
//             const exists = await User.exists({ _id: userId });
//             if (!exists) {
//                 return res.status(400).json({
//                     message: "User not found",
//                     success: false
//                 });
//             }
            
//             const expiredUser = await User.findOne({ _id: userId });
//             if (expiredUser?.otpExpiry && expiredUser.otpExpiry <= Date.now()) {
//                 return res.status(400).json({
//                     message: "OTP has expired. Please request a new one.",
//                     success: false
//                 });
//             }
            
//             return res.status(400).json({
//                 message: "No active OTP found for this user",
//                 success: false
//             });
//         }

//         console.log('Comparing OTPs - stored:', user.otp, 'received:', otp);
        
//         if (user.otp !== otp) {
//             return res.status(400).json({
//                 message: "Invalid OTP code",
//                 success: false
//             });
//         }

//         // Verify user
//         user.isVerified = true;
//         user.isOtpVerified = true;
//         user.otp = undefined;
//         user.otpExpiry = undefined;
//         await user.save();

//         return res.status(200).json({
//             message: "Account verified successfully",
//             success: true,
//             user: {
//                 _id: user._id,
//                 email: user.email
//             }
//         });

//     } catch (error) {
//         console.error('OTP verification error:', error);
//         return res.status(500).json({
//             message: "Internal server error",
//             success: false
//         });
//     }
// }

export const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Update user with new OTP
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        user.isOtpVerified = false;
        await user.save();

        // Send new OTP email
        await sendOTPEmail(user.email, otp);

        return res.status(200).json({
            message: "New OTP sent to your email",
            success: true
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({
            message: "Failed to resend OTP",
            success: false
        });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        };
        // check role is correct or not
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            })
        };

        if (!user.isOtpVerified) {
            return res.status(403).json({
                message: "Please verify your account with OTP first",
                success: false,
                isOtpVerified: false,
                userId: user._id
            });
        }

        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: 'strict' }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}


export const logout = async (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills } = req.body;
        
        const file = req.file;
        // cloudinary ayega idhar
        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content);



        let skillsArray;
        if(skills){
            skillsArray = skills.split(",");
        }
        const userId = req.id; // middleware authentication
        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            })
        }
        // updating data
        if(fullname) user.fullname = fullname
        if(email) user.email = email
        if(phoneNumber)  user.phoneNumber = phoneNumber
        if(bio) user.profile.bio = bio
        if(skills) user.profile.skills = skillsArray
      
        // resume comes later here...
        if(cloudResponse){
            user.profile.resume = cloudResponse.secure_url // save the cloudinary url
            user.profile.resumeOriginalName = file.originalname // Save the original file name
        }


        await user.save();

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).json({
            message:"Profile updated successfully.",
            user,
            success:true
        })
    } catch (error) {
        console.log(error);
    }
}