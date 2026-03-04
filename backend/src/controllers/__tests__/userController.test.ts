import { Request, Response, NextFunction } from 'express';
import { register, login, logout, getUser } from '../userController';
import { User } from '../../models/user.model';
import { sendToken } from '../../utils/jwtToken';
import ErrorHandler from '../../middlewares/error';

// Mock dependencies
jest.mock('../../models/user.model');
jest.mock('../../utils/jwtToken');

// Extend Request type for tests
interface RequestWithUser extends Request {
  user?: any;
}

describe('User Controller', () => {
  let mockReq: Partial<RequestWithUser>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockCookie: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockCookie = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockReq = {
      body: {},
      cookies: {}
    };

    mockRes = {
      json: mockJson,
      cookie: mockCookie,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      password: 'Password123',
      role: 'Job Seeker'
    };

    test('should return 400 if any field is missing', async () => {
      mockReq.body = { name: 'John' };

      await register(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Please fill full form!');
      expect(error.statusCode).toBe(400);
    });

    test('should return 400 if email already exists', async () => {
      mockReq.body = validUserData;
      
      (User.findOne as jest.Mock).mockResolvedValue({ email: validUserData.email });

      await register(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Email already registered!');
      expect(error.statusCode).toBe(400);
    });

    test('should create user and send token with valid data', async () => {
      mockReq.body = validUserData;
      
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      const mockCreatedUser = {
        ...validUserData,
        _id: '507f1f77bcf86cd799439011'
      };
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      await register(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(sendToken).toHaveBeenCalledTimes(1);
      expect(sendToken).toHaveBeenCalledWith(
        mockCreatedUser,
        201,
        mockRes,
        'User Registered Successfully!'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'john@example.com',
      password: 'Password123',
      role: 'Job Seeker'
    };

    test('should return 400 if any field is missing', async () => {
      mockReq.body = { email: 'john@example.com' };

      await login(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Please provide email, password and role!');
      expect(error.statusCode).toBe(400);
    });

    test('should return 400 if user not found', async () => {
      mockReq.body = validLoginData;
      
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      (User.findOne as jest.Mock).mockReturnValue(mockQuery);

      await login(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Invalid Email Or Password.');
      expect(error.statusCode).toBe(400);
    });

    test('should return 400 if password is incorrect', async () => {
      mockReq.body = validLoginData;
      
      const mockUser = {
        email: validLoginData.email,
        role: validLoginData.role,
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      (User.findOne as jest.Mock).mockReturnValue(mockQuery);

      await login(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Invalid Email Or Password!');
      expect(error.statusCode).toBe(400);
    });

    test('should return 404 if role does not match', async () => {
      mockReq.body = validLoginData;
      
      const mockUser = {
        email: validLoginData.email,
        role: 'Employer',
        comparePassword: jest.fn().mockResolvedValue(true)
      };
      
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      (User.findOne as jest.Mock).mockReturnValue(mockQuery);

      await login(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorHandler));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('User with provided email and Job Seeker not found!');
      expect(error.statusCode).toBe(404);
    });

    test('should send token with valid credentials', async () => {
      mockReq.body = validLoginData;
      
      const mockUser = {
        email: validLoginData.email,
        role: validLoginData.role,
        comparePassword: jest.fn().mockResolvedValue(true)
      };
      
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      (User.findOne as jest.Mock).mockReturnValue(mockQuery);

      await login(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(sendToken).toHaveBeenCalledTimes(1);
      expect(sendToken).toHaveBeenCalledWith(
        mockUser,
        201,
        mockRes,
        'User Logged In Successfully!'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    test('should clear token cookie and return success message', async () => {
      await logout(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockCookie).toHaveBeenCalledWith('token', '', {
        httpOnly: true,
        expires: expect.any(Date)
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Logged Out Successfully!'
      });
    });
  });

  describe('getUser', () => {
    test('should return current user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      mockReq.user = mockUser;

      await getUser(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: mockUser
      });
    });
  });
});