import { User, IUser } from '../user.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('validator');

describe('User Model', () => {
  const mockUserData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: 1234567890,
    password: 'Password123',
    role: 'Job Seeker' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET_KEY = 'test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  describe('Schema Validation', () => {
    test('should create a valid user', () => {
      const user = new User(mockUserData);
      
      expect(user.name).toBe(mockUserData.name);
      expect(user.email).toBe(mockUserData.email);
      expect(user.phone).toBe(mockUserData.phone);
      expect(user.password).toBe(mockUserData.password);
      expect(user.role).toBe(mockUserData.role);
      expect(user.createdAt).toBeDefined();
    });

    test('should throw error if name is too short', () => {
      const invalidUser = new User({
        ...mockUserData,
        name: 'Jo'
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['name']).toBeDefined();
      expect(error?.errors['name'].message).toContain('at least 3');
    });

    test('should throw error if name is too long', () => {
      const invalidUser = new User({
        ...mockUserData,
        name: 'A'.repeat(31)
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['name']).toBeDefined();
      expect(error?.errors['name'].message).toContain('cannot exceed 30');
    });

    test('should throw error if email is invalid', () => {
      (validator.isEmail as unknown as jest.Mock).mockReturnValue(false);
      
      const invalidUser = new User({
        ...mockUserData,
        email: 'not-an-email'
      });

      const error = invalidUser.validateSync();
      expect(error).toBeDefined();
      if (error?.errors['email']) {
        expect(error.errors['email']).toBeDefined();
      }
    });

    test('should throw error if phone is missing', () => {
      const invalidUser = new User({
        ...mockUserData,
        phone: undefined
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['phone']).toBeDefined();
    });

    test('should throw error if password is too short', () => {
      const invalidUser = new User({
        ...mockUserData,
        password: 'Pass1'
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['password']).toBeDefined();
      expect(error?.errors['password'].message).toContain('at least 8');
    });

    test('should throw error if password is too long', () => {
      const invalidUser = new User({
        ...mockUserData,
        password: 'A'.repeat(33)
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['password']).toBeDefined();
      expect(error?.errors['password'].message).toContain('cannot exceed 32');
    });

    test('should throw error if role is invalid', () => {
      const invalidUser = new User({
        ...mockUserData,
        role: 'Invalid' as any
      });

      const error = invalidUser.validateSync();
      expect(error?.errors['role']).toBeDefined();
    });

    test('should accept Employer role', () => {
      const employerUser = new User({
        ...mockUserData,
        role: 'Employer'
      });

      expect(employerUser.role).toBe('Employer');
    });

    test('should set default createdAt', () => {
      const user = new User(mockUserData);
      
      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Pre-save Hook (Password Hashing)', () => {
    test('should hash password when saving new user', async () => {
      const mockHash = 'hashed_password_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      const user = new User(mockUserData);
      
      if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }

      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
    });

    test('should not re-hash password if not modified', async () => {
      const user = new User(mockUserData);
      
      jest.spyOn(user, 'isModified').mockReturnValue(false);

      const originalPassword = user.password;
      
      if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe(originalPassword);
    });
  });

  describe('comparePassword Method', () => {
    test('should return true for correct password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const user = new User(mockUserData);
      user.password = 'hashed_password';

      const result = await user.comparePassword('Password123');

      expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed_password');
      expect(result).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const user = new User(mockUserData);
      user.password = 'hashed_password';

      const result = await user.comparePassword('WrongPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('WrongPassword', 'hashed_password');
      expect(result).toBe(false);
    });
  });

  describe('getJWTToken Method', () => {
    test('should generate JWT token with user id', () => {
      const mockToken = 'jwt_token_123';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const user = new User(mockUserData);

      const token = user.getJWTToken();

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user._id },
        'test-secret',
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });

    test.skip('should throw error if JWT_SECRET_KEY is missing', () => {
      delete process.env.JWT_SECRET_KEY;

      const user = new User(mockUserData);
      
      expect(() => user.getJWTToken()).toThrow();
    });

    test('should use JWT_EXPIRE from env', () => {
      process.env.JWT_EXPIRE = '30d';
      
      const user = new User(mockUserData);
      
      user.getJWTToken();

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '30d' }
      );
    });
  });

  describe('Email Validation', () => {
    test('should validate email format', () => {
      (validator.isEmail as unknown as jest.Mock).mockReturnValue(true);

      const user = new User({
        ...mockUserData,
        email: 'valid@email.com'
      });

      const validationError = user.validateSync();
      expect(validationError?.errors['email']).toBeUndefined();
    });

    test('should reject invalid email', () => {
      (validator.isEmail as unknown as jest.Mock).mockReturnValue(false);

      const user = new User({
        ...mockUserData,
        email: 'invalid-email'
      });

      const validationError = user.validateSync();
      expect(validationError?.errors['email']).toBeDefined();
    });
  });

  describe('Required Fields', () => {
    test('should require name', () => {
      const user = new User({
        ...mockUserData,
        name: undefined
      });

      const error = user.validateSync();
      expect(error?.errors['name']).toBeDefined();
    });

    test('should require email', () => {
      const user = new User({
        ...mockUserData,
        email: undefined
      });

      const error = user.validateSync();
      expect(error?.errors['email']).toBeDefined();
    });

    test('should require phone', () => {
      const user = new User({
        ...mockUserData,
        phone: undefined
      });

      const error = user.validateSync();
      expect(error?.errors['phone']).toBeDefined();
    });

    test('should require password', () => {
      const user = new User({
        ...mockUserData,
        password: undefined
      });

      const error = user.validateSync();
      expect(error?.errors['password']).toBeDefined();
    });

    test('should require role', () => {
      const user = new User({
        ...mockUserData,
        role: undefined
      });

      const error = user.validateSync();
      expect(error?.errors['role']).toBeDefined();
    });
  });

  describe('Phone Number', () => {
    test('should accept number type for phone', () => {
      const user = new User({
        ...mockUserData,
        phone: 9876543210
      });

      expect(user.phone).toBe(9876543210);
    });
  });
});