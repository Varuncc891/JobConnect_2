import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateQuery } from '../validate.middleware';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockReq = {
      body: {},
      query: {}
    };
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('validate (body validation)', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      age: z.number().min(18)
    });

    test('should pass valid body and call next', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      mockReq.body = validBody;

      const middleware = validate(testSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockReq.body).toEqual(validBody);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockJson).not.toHaveBeenCalled();
    });

    test('should return 400 with formatted errors for invalid body', async () => {
      const invalidBody = {
        name: 'Jo', // too short
        email: 'not-an-email',
        age: 16 // too young
      };
      mockReq.body = invalidBody;

      const middleware = validate(testSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'email',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.any(String)
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle missing required fields', async () => {
      const middleware = validate(testSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'age' })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass non-Zod errors to next', async () => {
      // Create a schema that throws a non-Zod error
      const errorSchema = {
        parseAsync: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any;

      const middleware = validate(errorSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockJson).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery (query validation)', () => {
    const querySchema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1)),
      limit: z.string().transform(Number).pipe(z.number().max(100)),
      category: z.string().optional()
    });

    test('should pass valid query and call next', async () => {
      const validQuery = {
        page: '2',
        limit: '50',
        category: 'Engineering'
      };
      mockReq.query = validQuery;

      const middleware = validateQuery(querySchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockReq.query).toEqual({
        page: 2,
        limit: 50,
        category: 'Engineering'
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should handle empty query params', async () => {
      // Schema with defaults
      const schemaWithDefaults = z.object({
        page: z.string().default('1').transform(Number),
        limit: z.string().default('20').transform(Number)
      });

      const middleware = validateQuery(schemaWithDefaults);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockReq.query).toEqual({
        page: 1,
        limit: 20
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should return 400 with formatted errors for invalid query', async () => {
      const invalidQuery = {
        page: '0', // too low
        limit: '200' // too high
      };
      mockReq.query = invalidQuery;

      const middleware = validateQuery(querySchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid query parameters',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'page' }),
          expect.objectContaining({ field: 'limit' })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle invalid number conversions', async () => {
      const invalidQuery = {
        page: 'abc',
        limit: 'xyz'
      };
      mockReq.query = invalidQuery;

      const middleware = validateQuery(querySchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid query parameters',
        errors: expect.any(Array)
      });
    });

    test('should format error paths correctly for nested fields', async () => {
      const nestedSchema = z.object({
        filter: z.object({
          minPrice: z.string().regex(/^\d+$/),
          maxPrice: z.string().regex(/^\d+$/)
        })
      });

      const invalidQuery = {
        filter: {
          minPrice: 'abc',
          maxPrice: 'xyz'
        }
      };
      mockReq.query = invalidQuery;

      const middleware = validateQuery(nestedSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'filter.minPrice' }),
            expect.objectContaining({ field: 'filter.maxPrice' })
          ])
        })
      );
    });

    test('should pass non-Zod errors to next', async () => {
      const errorSchema = {
        parseAsync: jest.fn().mockRejectedValue(new Error('Redis error'))
      } as any;

      const middleware = validateQuery(errorSchema);
      await middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });
});