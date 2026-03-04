import { Request, Response, NextFunction } from 'express';
import { parseResume } from '../resumeController';
import ErrorHandler from '../../middlewares/error';
import { ResumeParserService } from '../../services/resumeParser.service';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Mock everything
jest.mock('../../services/resumeParser.service');
jest.mock('cloudinary');
jest.mock('fs');

describe('Resume Controller', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      files: null,
      body: {},
      params: {},
      user: { _id: 'user123' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('parseResume', () => {
    test('should return 400 if no file uploaded', async () => {
      await parseResume(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please upload a resume file',
          statusCode: 400
        })
      );
    });

    test('should return 400 if invalid file type', async () => {
      mockReq.files = {
        resume: { mimetype: 'application/exe' }
      };

      await parseResume(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid file type. Please upload PDF, PNG, JPEG, or WEBP',
          statusCode: 400
        })
      );
    });

    test('should return 400 if file too large (>5MB)', async () => {
      mockReq.files = {
        resume: { 
          mimetype: 'application/pdf',
          size: 6 * 1024 * 1024 // 6MB
        }
      };

      await parseResume(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File size too large. Maximum 5MB allowed',
          statusCode: 400
        })
      );
    });
  });
});