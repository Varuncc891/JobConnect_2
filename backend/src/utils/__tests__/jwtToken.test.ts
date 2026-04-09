import { Response } from 'express';
import { sendToken } from '../jwtToken';
import { IUser } from '../../models/user.model';

jest.mock('../../models/user.model');

describe('JWT Token Utility', () => {
  let mockUser: Partial<IUser>;
  let mockRes: Partial<Response>;
  let mockCookie: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockCookie = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRes = {
      cookie: mockCookie,
      json: mockJson,
      status: mockStatus,
    } as Partial<Response>;

    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Job Seeker',
      getJWTToken: jest.fn().mockReturnValue('mock-jwt-token')
    };
    
    process.env.COOKIE_EXPIRE = '7';
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  test('should send token in cookie and response', () => {
    sendToken(
      mockUser as IUser, 
      200, 
      mockRes as Response, 
      'Login successful'
    );

    expect(mockCookie).toHaveBeenCalledWith(
      'token',
      'mock-jwt-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        expires: expect.any(Date)
      })
    );

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      user: mockUser,
      message: 'Login successful',
      token: 'mock-jwt-token'
    });
  });

  test('should handle different status codes and messages', () => {
    sendToken(
      mockUser as IUser, 
      201, 
      mockRes as Response, 
      'Registration successful'
    );

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      user: mockUser,
      message: 'Registration successful',
      token: 'mock-jwt-token'
    });
  });

  test('should use COOKIE_EXPIRE environment variable', () => {
    process.env.COOKIE_EXPIRE = '30';
    
    sendToken(
      mockUser as IUser, 
      200, 
      mockRes as Response, 
      'Login successful'
    );

    expect(mockCookie).toHaveBeenCalledWith(
      'token',
      'mock-jwt-token',
      expect.objectContaining({
        expires: expect.any(Date)
      })
    );

    const cookieOptions = mockCookie.mock.calls[0][2];
    const expectedExpiry = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    
    expect(Math.abs(cookieOptions.expires.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
  });

  test('should work with Employer role', () => {
    const employerUser = {
      ...mockUser,
      role: 'Employer'
    };

    sendToken(
      employerUser as IUser, 
      200, 
      mockRes as Response, 
      'Login successful'
    );

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      user: employerUser,
      message: 'Login successful',
      token: 'mock-jwt-token'
    });
  });
});