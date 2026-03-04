// Mock nodemailer BEFORE importing the service
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail
  })
}));

import { sendJobStatusEmail } from '../email.service';

describe('Email Service', () => {
  beforeEach(() => {
    // Set environment variables
    process.env.EMAIL_USER = 'test@gmail.com';
    process.env.EMAIL_PASS = 'testpass';
    process.env.EMAIL_FROM = 'noreply@skillbridge.com';

    jest.clearAllMocks();
  });

  const testData = {
    to: 'seeker@example.com',
    name: 'John Doe',
    jobTitle: 'Software Engineer',
    companyName: 'Tech Corp'
  };

  describe('sendJobStatusEmail', () => {
    test('should send accepted email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@skillbridge.com',
        to: 'seeker@example.com',
        subject: 'Congratulations! Shortlisted for Software Engineer',
        html: expect.stringContaining('You\'re Shortlisted!')
      });

      // Check HTML content
      const htmlContent = mockSendMail.mock.calls[0][0].html;
      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('Software Engineer');
      expect(htmlContent).toContain('Tech Corp');
      expect(htmlContent).toContain('#22c55e');
    });

    test('should send rejected email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'rejected'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@skillbridge.com',
        to: 'seeker@example.com',
        subject: 'Update on your application for Software Engineer',
        html: expect.stringContaining('Application Update')
      });

      const htmlContent = mockSendMail.mock.calls[0][0].html;
      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('Software Engineer');
      expect(htmlContent).toContain('Tech Corp');
      expect(htmlContent).toContain('#ef4444');
    });

    test('should handle email sending failure', async () => {
      const error = new Error('SMTP error');
      mockSendMail.mockRejectedValue(error);

      await expect(
        sendJobStatusEmail(
          testData.to,
          testData.name,
          testData.jobTitle,
          testData.companyName,
          'accepted'
        )
      ).rejects.toThrow('SMTP error');
    });

    test('should work with different email addresses', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const differentData = {
        to: 'another@example.com',
        name: 'Jane Smith',
        jobTitle: 'Product Manager',
        companyName: 'Startup Inc'
      };

      await sendJobStatusEmail(
        differentData.to,
        differentData.name,
        differentData.jobTitle,
        differentData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@skillbridge.com',
        to: 'another@example.com',
        subject: 'Congratulations! Shortlisted for Product Manager',
        html: expect.stringContaining('Jane Smith')
      });
    });

    test('should handle missing environment variables', async () => {
      // Clear env vars
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      delete process.env.EMAIL_FROM;

      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: undefined,
        to: testData.to,
        subject: expect.any(String),
        html: expect.any(String)
      });
    });

    test('should use correct email subject line for accepted', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        'Senior Developer',
        testData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Congratulations! Shortlisted for Senior Developer'
        })
      );
    });

    test('should use correct email subject line for rejected', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        'Junior Developer',
        testData.companyName,
        'rejected'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Update on your application for Junior Developer'
        })
      );
    });

    test('should include all required placeholders in email body', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      const htmlContent = mockSendMail.mock.calls[0][0].html;
      
      expect(htmlContent).toContain(testData.name);
      expect(htmlContent).toContain(testData.jobTitle);
      expect(htmlContent).toContain(testData.companyName);
      expect(htmlContent).toContain('SkillBridge Team');
    });

    test('should handle long job titles', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });
      
      const longJobTitle = 'Senior Full Stack Software Engineer with React and Node.js Experience';

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        longJobTitle,
        testData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `Congratulations! Shortlisted for ${longJobTitle}`
        })
      );
    });

    test('should handle special characters in name', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        'John O\'Connor-Smith',
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      const htmlContent = mockSendMail.mock.calls[0][0].html;
      expect(htmlContent).toContain('John O\'Connor-Smith');
    });

    test('should call sendMail exactly once per email', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test('should use correct transporter configuration', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await sendJobStatusEmail(
        testData.to,
        testData.name,
        testData.jobTitle,
        testData.companyName,
        'accepted'
      );

      const { createTransport } = require('nodemailer');
      expect(createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    });
  });
});