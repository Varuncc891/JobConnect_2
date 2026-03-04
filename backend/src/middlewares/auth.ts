import { Request, Response, NextFunction } from 'express';
import { User } from "../models/user.model";
import { catchAsyncErrors } from "./catchAsyncError";
import ErrorHandler from "./error";
import jwt from 'jsonwebtoken';

export const isAuthenticated = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.cookies;

    if (!token) {
      return next(new ErrorHandler("User Not Authorized", 401));
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET_KEY!);

    // @ts-ignore
    req.user = await User.findById(decoded.id);

    next();
  }
);