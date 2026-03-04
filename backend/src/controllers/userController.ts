import { Request, Response, NextFunction } from 'express';
import { catchAsyncErrors } from "../middlewares/catchAsyncError";
import { User } from "../models/user.model";
import ErrorHandler from "../middlewares/error";
import { sendToken } from "../utils/jwtToken";

export const register = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return next(new ErrorHandler("Please fill full form!", 400));
    }

    const isEmail = await User.findOne({ email });
    if (isEmail) {
      return next(new ErrorHandler("Email already registered!", 400));
    }

    const user = await User.create({ name, email, phone, password, role });

    sendToken(user, 201, res, "User Registered Successfully!");
  }
);

export const login = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return next(new ErrorHandler("Please provide email, password and role!", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid Email Or Password.", 400));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid Email Or Password!", 400));
    }

    if (user.role !== role) {
      return next(new ErrorHandler(`User with provided email and ${role} not found!`, 404));
    }

    sendToken(user, 201, res, "User Logged In Successfully!");
  }
);

export const logout = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(201).cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    }).json({
      success: true,
      message: "Logged Out Successfully!",
    });
  }
);

export const getUser = catchAsyncErrors(
  (req: any, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
);