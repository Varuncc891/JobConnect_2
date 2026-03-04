import { postApplicationSchema } from '../application.validator';

describe('Application Validator', () => {
  const validApplicationData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    address: '123 Main Street, New York, NY 10001',
    coverLetter: 'I am very interested in this position because I have 5 years of experience in the field and believe I would be a great addition to your team.',
    jobId: '507f1f77bcf86cd799439011'
  };

  describe('Post Application Schema', () => {
    test('should validate valid application data', () => {
      const result = postApplicationSchema.safeParse(validApplicationData);
      expect(result.success).toBe(true);
    });

    describe('Name validation', () => {
      test('should fail if name is too short', () => {
        const invalidData = {
          ...validApplicationData,
          name: 'Jo'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be at least 3 characters');
        }
      });

      test('should fail if name is too long', () => {
        const invalidData = {
          ...validApplicationData,
          name: 'A'.repeat(31)
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name cannot exceed 30 characters');
        }
      });

      test('should fail if name contains special characters', () => {
        const invalidData = {
          ...validApplicationData,
          name: 'John@Doe'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name can only contain letters and spaces');
        }
      });
    });

    describe('Email validation', () => {
      test('should fail with invalid email', () => {
        const invalidData = {
          ...validApplicationData,
          email: 'not-an-email'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Please provide a valid email');
        }
      });

      test('should convert uppercase to lowercase', () => {
        const data = {
          ...validApplicationData,
          email: 'JOHN.DOE@EXAMPLE.COM'
        };

        const result = postApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('john.doe@example.com');
        }
      });

      test('should reject email with spaces (validation happens before trim)', () => {
        const data = {
          ...validApplicationData,
          email: '  john.doe@example.com  '
        };

        const result = postApplicationSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Phone validation', () => {
      test('should accept string phone number', () => {
        const data = {
          ...validApplicationData,
          phone: '1234567890'
        };

        const result = postApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      test('should accept number phone number and convert to string', () => {
        const data = {
          ...validApplicationData,
          phone: 1234567890
        };

        const result = postApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.phone).toBe('1234567890');
        }
      });

      test('should fail if phone is not 10 digits', () => {
        const invalidData = {
          ...validApplicationData,
          phone: '12345'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Phone number must be exactly 10 digits');
        }
      });

      test('should fail if phone contains non-digits', () => {
        const invalidData = {
          ...validApplicationData,
          phone: '12345abc90'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('Address validation', () => {
      test('should fail if address too short', () => {
        const invalidData = {
          ...validApplicationData,
          address: '123'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Address must be at least 5 characters');
        }
      });

      test('should fail if address too long', () => {
        const invalidData = {
          ...validApplicationData,
          address: 'A'.repeat(201)
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          // Fix: Check for the correct error message for too long
          expect(result.error.issues[0].message).toContain('Too big');
        }
      });
    });

    describe('Cover Letter validation', () => {
      test('should fail if cover letter too short', () => {
        const invalidData = {
          ...validApplicationData,
          coverLetter: 'Too short'
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Cover letter must be at least 10 characters');
        }
      });

      test('should fail if cover letter too long', () => {
        const invalidData = {
          ...validApplicationData,
          coverLetter: 'A'.repeat(2001)
        };

        const result = postApplicationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          // Fix: Check for the correct error message for too long
          expect(result.error.issues[0].message).toContain('Too big');
        }
      });
    });

    describe('Job ID validation', () => {
      test('should validate valid MongoDB ObjectId', () => {
        const validObjectIds = [
          '507f1f77bcf86cd799439011',
          '507f191e810c19729de860ea',
          '000000000000000000000000'
        ];

        validObjectIds.forEach(jobId => {
          const data = {
            ...validApplicationData,
            jobId
          };
          const result = postApplicationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      test('should fail with invalid job ID format', () => {
        const invalidObjectIds = [
          '123',
          'invalid-id',
          '507f1f77bcf86cd79943901Z', // invalid character
          '507f1f77bcf86cd79943901', // too short
          '507f1f77bcf86cd7994390111' // too long
        ];

        invalidObjectIds.forEach(jobId => {
          const data = {
            ...validApplicationData,
            jobId
          };
          const result = postApplicationSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid job ID format');
          }
        });
      });
    });
  });
});