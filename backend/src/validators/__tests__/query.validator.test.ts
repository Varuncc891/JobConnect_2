import { jobQuerySchema } from '../query.validator';

describe('Job Query Validator', () => {
  describe('Page and Limit', () => {
    test('should use default values when no params provided', () => {
      const result = jobQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    test('should parse valid page number from string', () => {
      const result = jobQuerySchema.safeParse({ page: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    test('should use default page if invalid page string', () => {
      const result = jobQuerySchema.safeParse({ page: 'abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    test('should fail if page less than 1', () => {
      const result = jobQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Page must be at least 1');
      }
    });

    test('should parse valid limit from string', () => {
      const result = jobQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    test('should use default limit if invalid limit string', () => {
      const result = jobQuerySchema.safeParse({ limit: 'abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    test('should fail if limit exceeds 100', () => {
      const result = jobQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Limit cannot exceed 100');
      }
    });

    test('should fail if limit less than 1', () => {
      const result = jobQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });
  });

  describe('Filter parameters', () => {
    test('should accept optional category filter', () => {
      const result = jobQuerySchema.safeParse({ category: 'Engineering' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('Engineering');
      }
    });

    test('should trim category value', () => {
      const result = jobQuerySchema.safeParse({ category: '  Engineering  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('Engineering');
      }
    });

    test('should accept optional city filter', () => {
      const result = jobQuerySchema.safeParse({ city: 'Mumbai' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe('Mumbai');
      }
    });

    test('should trim city value', () => {
      const result = jobQuerySchema.safeParse({ city: '  Mumbai  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe('Mumbai');
      }
    });

    test('should accept optional country filter', () => {
      const result = jobQuerySchema.safeParse({ country: 'India' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('India');
      }
    });

    test('should trim country value', () => {
      const result = jobQuerySchema.safeParse({ country: '  India  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('India');
      }
    });

    test('should handle all filters together', () => {
      const result = jobQuerySchema.safeParse({
        category: 'Engineering',
        city: 'Mumbai',
        country: 'India'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('Engineering');
        expect(result.data.city).toBe('Mumbai');
        expect(result.data.country).toBe('India');
      }
    });
  });

  describe('Salary filters', () => {
    test('should accept valid minSalary', () => {
      const result = jobQuerySchema.safeParse({ minSalary: '50000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minSalary).toBe(50000);
      }
    });

    test('should accept valid maxSalary', () => {
      const result = jobQuerySchema.safeParse({ maxSalary: '100000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxSalary).toBe(100000);
      }
    });

    test('should accept both salary filters', () => {
      const result = jobQuerySchema.safeParse({
        minSalary: '50000',
        maxSalary: '100000'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minSalary).toBe(50000);
        expect(result.data.maxSalary).toBe(100000);
      }
    });

    test('should handle empty salary string as undefined', () => {
      const result = jobQuerySchema.safeParse({ minSalary: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minSalary).toBeUndefined();
      }
    });

    test('should handle invalid salary string as undefined', () => {
      const result = jobQuerySchema.safeParse({ minSalary: 'abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.minSalary).toBeUndefined();
      }
    });

    test('should fail if minSalary is negative', () => {
      const result = jobQuerySchema.safeParse({ minSalary: '-1000' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Salary must be positive');
      }
    });

    test('should fail if maxSalary is negative', () => {
      const result = jobQuerySchema.safeParse({ maxSalary: '-1000' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Salary must be positive');
      }
    });
  });

  describe('Sort options', () => {
    test('should default to newest when no sortBy provided', () => {
      const result = jobQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('newest');
      }
    });

    test('should accept valid sortBy values', () => {
      const validSorts = ['newest', 'oldest', 'salary-high', 'salary-low'];
      
      validSorts.forEach(sortBy => {
        const result = jobQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy);
        }
      });
    });

    test('should fail with invalid sortBy value', () => {
      const result = jobQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('Combined queries', () => {
    test('should handle complex query with all parameters', () => {
      const complexQuery = {
        page: '3',
        limit: '50',
        category: 'Engineering',
        city: 'Mumbai',
        country: 'India',
        minSalary: '50000',
        maxSalary: '100000',
        sortBy: 'salary-high'
      };

      const result = jobQuerySchema.safeParse(complexQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
        expect(result.data.category).toBe('Engineering');
        expect(result.data.city).toBe('Mumbai');
        expect(result.data.country).toBe('India');
        expect(result.data.minSalary).toBe(50000);
        expect(result.data.maxSalary).toBe(100000);
        expect(result.data.sortBy).toBe('salary-high');
      }
    });

    test('should handle mixed valid and invalid values', () => {
      const mixedQuery = {
        page: 'abc', // invalid -> defaults to 1
        limit: '150', // invalid (too high) -> should fail
        category: '  Engineering  ',
        minSalary: 'abc', // invalid -> undefined
        sortBy: 'newest'
      };

      const result = jobQuerySchema.safeParse(mixedQuery);
      // limit:150 should fail because >100
      expect(result.success).toBe(false);
    });
  });
});