import { Request, Response, NextFunction } from 'express';
import { errorMiddleware, default as ErrorHandler } from '../error';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  test('should handle string error', () => {
    const stringError = 'Something went wrong';

    errorMiddleware(
      stringError,
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: stringError
    });
  });

  test('should handle ErrorHandler instance', () => {
    const error = new ErrorHandler('Custom error', 404);

    errorMiddleware(
      error,
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: 'Custom error'
    });
  });

  test('should handle error with default values', () => {
    const error = new Error('Default error');

    errorMiddleware(
      error,
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: 'Default error'
    });
  });

  describe('MongoDB CastError', () => {
    test('should handle CastError', () => {
      const castError = new Error('Invalid ID') as any;
      castError.name = 'CastError';
      castError.path = 'jobId';

      errorMiddleware(
        castError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found. Invalid jobId'
      });
    });

    test('should handle CastError with different path', () => {
      const castError = new Error('Invalid ID') as any;
      castError.name = 'CastError';
      castError.path = 'userId';

      errorMiddleware(
        castError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found. Invalid userId'
      });
    });
  });

  describe('MongoDB Duplicate Key Error (11000)', () => {
    test('should handle duplicate key error', () => {
      const dupError = new Error('Duplicate key') as any;
      dupError.code = 11000;
      dupError.keyValue = { email: 'test@example.com' };

      errorMiddleware(
        dupError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate email Entered'
      });
    });

    test('should handle duplicate key with multiple fields', () => {
      const dupError = new Error('Duplicate key') as any;
      dupError.code = 11000;
      dupError.keyValue = { email: 'test@example.com', phone: '1234567890' };

      errorMiddleware(
        dupError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Duplicate')
      });
    });
  });

  describe('JWT Errors', () => {
    test('should handle JsonWebTokenError', () => {
      const jwtError = new Error('Invalid token') as any;
      jwtError.name = 'JsonWebTokenError';

      errorMiddleware(
        jwtError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Json Web Token is invalid, Try again please!'
      });
    });

    test('should handle TokenExpiredError', () => {
      const tokenError = new Error('Token expired') as any;
      tokenError.name = 'TokenExpiredError';

      errorMiddleware(
        tokenError,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Json Web Token is expired, Try again please!'
      });
    });
  });

  describe('Error with additional properties', () => {
    test('should preserve custom status code and message', () => {
      const error = new Error('Custom') as any;
      error.statusCode = 403;
      error.message = 'Forbidden access';

      errorMiddleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden access'
      });
    });

    test('should handle error with only statusCode', () => {
      const error = new Error() as any;
      error.statusCode = 429;

      errorMiddleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle error object without message', () => {
      const error = { statusCode: 500 } as any;

      errorMiddleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });
  });

  test('should not call next', () => {
    const error = new ErrorHandler('Test', 400);

    errorMiddleware(
      error,
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).not.toHaveBeenCalled();
  });
});