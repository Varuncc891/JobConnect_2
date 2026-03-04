import { Response } from 'express';
import { IUser } from '../models/user.model';

export const sendToken = (user: IUser, statusCode: number, res: Response, message: string) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.COOKIE_EXPIRE!) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax' as const,
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    message,
    token,
  });
};