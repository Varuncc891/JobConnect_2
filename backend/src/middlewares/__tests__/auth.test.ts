import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isAuthenticated } from '../auth';
import { User } from '../../models/user.model';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/user.model');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      cookies: {}
    };
    mockRes = {};
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Set environment variable for tests
    process.env.JWT_SECRET_KEY = 'test-secret-key';
  });

  test('should call next with error if no token provided', async () => {
    // No token in cookies
    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User Not Authorized',
        statusCode: 401
      })
    );
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('should call next with error if token is invalid', async () => {
    // Add token to cookies
    mockReq.cookies = { token: 'invalid-token' };

    // Mock jwt.verify to throw error
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret-key');
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('should set req.user and call next if token is valid', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Job Seeker'
    };

    // Add token to cookies
    mockReq.cookies = { token: 'valid-token' };

    // Mock jwt.verify to return decoded token
    (jwt.verify as jest.Mock).mockReturnValue({ id: mockUser._id });

    // Mock User.findById to return user
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
    expect(User.findById).toHaveBeenCalledWith(mockUser._id);
    
    // @ts-ignore - req.user is set
    expect(mockReq.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith(); // called with no args
  });

  test('should handle case when user not found in database', async () => {
    // Add token to cookies
    mockReq.cookies = { token: 'valid-token' };

    // Mock jwt.verify to return decoded token
    (jwt.verify as jest.Mock).mockReturnValue({ id: '507f1f77bcf86cd799439011' });

    // Mock User.findById to return null (user not found)
    (User.findById as jest.Mock).mockResolvedValue(null);

    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(jwt.verify).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalled();
    // @ts-ignore - req.user should be null
    expect(mockReq.user).toBeNull();
    expect(mockNext).toHaveBeenCalledWith(); // called with no args
  });

  test('should use correct JWT secret from environment', async () => {
    mockReq.cookies = { token: 'valid-token' };
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'some-id' });
    (User.findById as jest.Mock).mockResolvedValue({});

    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
  });

  test('should handle missing JWT_SECRET_KEY', async () => {
    // Remove JWT secret
    delete process.env.JWT_SECRET_KEY;

    mockReq.cookies = { token: 'valid-token' };

    // Mock jwt.verify to throw error when no secret
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('secretOrPrivateKey must have a value');
    });

    await isAuthenticated(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});