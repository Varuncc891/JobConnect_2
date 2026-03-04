import { registerSchema, loginSchema } from '../user.validator';

describe('User Validators', () => {
  describe('Register Schema', () => {
    test('should validate valid job seeker registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'Password123',
        role: 'Job Seeker'
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate valid employer registration data', () => {
      const validData = {
        name: 'Jane Smith',
        email: 'jane@company.com',
        phone: '9876543210',
        password: 'SecurePass456',
        role: 'Employer'
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    describe('Name validation', () => {
      test('should fail if name is too short', () => {
        const data = {
          name: 'Jo',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be at least 3 characters');
        }
      });

      test('should fail if name is too long', () => {
        const data = {
          name: 'A'.repeat(31),
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name cannot exceed 30 characters');
        }
      });

      test('should fail if name contains special characters', () => {
        const data = {
          name: 'John@Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name can only contain letters and spaces');
        }
      });
    });

    describe('Email validation', () => {
      test('should fail with invalid email', () => {
        const data = {
          name: 'John Doe',
          email: 'not-an-email',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Please provide a valid email');
        }
      });

      test('should convert uppercase to lowercase', () => {
        const data = {
          name: 'John Doe',
          email: 'JOHN.DOE@EXAMPLE.COM',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('john.doe@example.com');
        }
      });

      test('should reject email with spaces (validation happens before trim)', () => {
        const data = {
          name: 'John Doe',
          email: '  john.doe@example.com  ',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false); // Fails because email() sees spaces
      });
    });

    describe('Phone validation', () => {
      test('should accept string phone number', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test('should accept number phone number and convert to string', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: 1234567890,
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.phone).toBe('1234567890');
        }
      });

      test('should fail if phone is not 10 digits', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '12345',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Phone number must be exactly 10 digits');
        }
      });

      test('should fail if phone contains non-digits', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '12345abc90',
          password: 'Password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Password validation', () => {
      test('should fail if password too short', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Pass1',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
        }
      });

      test('should fail if password too long', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'A'.repeat(33) + '1',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password cannot exceed 32 characters');
        }
      });

      test('should fail if no uppercase letter', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'password123',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must contain at least one uppercase letter');
        }
      });

      test('should fail if no number', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password',
          role: 'Job Seeker'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must contain at least one number');
        }
      });
    });

    describe('Role validation', () => {
      test('should fail with invalid role', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          password: 'Password123',
          role: 'Admin'
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Login Schema', () => {
    test('should validate valid login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123',
        role: 'Job Seeker'
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should fail with invalid email', () => {
      const data = {
        email: 'invalid',
        password: 'Password123',
        role: 'Job Seeker'
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should fail with missing password', () => {
      const data = {
        email: 'john@example.com',
        password: '',
        role: 'Job Seeker'
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    test('should fail with invalid role', () => {
      const data = {
        email: 'john@example.com',
        password: 'Password123',
        role: 'Admin'
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should convert uppercase to lowercase', () => {
      const data = {
        email: 'JOHN.DOE@EXAMPLE.COM',
        password: 'Password123',
        role: 'Job Seeker'
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
      }
    });

    test('should reject email with spaces (validation happens before trim)', () => {
      const data = {
        email: '  john.doe@example.com  ',
        password: 'Password123',
        role: 'Job Seeker'
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});