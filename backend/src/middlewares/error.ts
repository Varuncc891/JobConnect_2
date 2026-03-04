import { Request, Response, NextFunction } from 'express';

class ErrorHandler extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof err === 'string') {
    return res.status(500).json({ success: false, message: err });
  }

  let error = { ...err };
  error.message = err.message || "Internal Server Error";
  error.statusCode = err.statusCode || 500;

  if (err.name === "CastError") {
    error = new ErrorHandler(`Resource not found. Invalid ${err.path}`, 400);
  }

  if (err.code === 11000) {
    error = new ErrorHandler(`Duplicate ${Object.keys(err.keyValue)} Entered`, 400);
  }

  if (err.name === "JsonWebTokenError") {
    error = new ErrorHandler("Json Web Token is invalid, Try again please!", 400);
  }

  if (err.name === "TokenExpiredError") {
    error = new ErrorHandler("Json Web Token is expired, Try again please!", 400);
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};

export default ErrorHandler;