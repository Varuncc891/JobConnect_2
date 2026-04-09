const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail
});

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport
}));

import { sendJobStatusEmail } from '../email.service';

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_USER = 'test@gmail.com';
    process.env.EMAIL_PASS = 'test-pass';
    process.env.EMAIL_FROM = 'noreply@test.com';
    mockSendMail.mockClear();
  });

  describe('sendJobStatusEmail', () => {
    test('should send accepted email with correct content', async () => {
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        'Software Engineer',
        'Tech Corp',
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Congratulations! Shortlisted for Software Engineer',
          html: expect.stringContaining('You\'re Shortlisted!')
        })
      );
    });

    test('should send rejected email with correct content', async () => {
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        'Software Engineer',
        'Tech Corp',
        'rejected'
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Update on your application for Software Engineer',
          html: expect.stringContaining('Application Update')
        })
      );
    });

    test('should handle email sending failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));

      await expect(
        sendJobStatusEmail(
          'test@example.com',
          'John Doe',
          'Software Engineer',
          'Tech Corp',
          'accepted'
        )
      ).rejects.toThrow('SMTP Error');
    });

    test('should work with different email addresses', async () => {
      await sendJobStatusEmail(
        'jane@company.com',
        'Jane Smith',
        'Product Manager',
        'Startup Inc',
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@company.com'
        })
      );
    });

    test('should handle missing environment variables', async () => {
      delete process.env.EMAIL_FROM;
      
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        'Software Engineer',
        'Tech Corp',
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: undefined
        })
      );
    });

    test.skip('should use correct email subject line for accepted', async () => {
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        'Senior Developer',
        'Big Company',
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Congratulations! Shortlisted for Senior Developer'
        })
      );
    });

    test.skip('should use correct email subject line for rejected', async () => {
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        'Junior Developer',
        'Small Company',
        'rejected'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Update on your application for Junior Developer'
        })
      );
    });

    test('should include all required placeholders in email body', async () => {
      await sendJobStatusEmail(
        'applicant@test.com',
        'Alice Johnson',
        'Full Stack Developer',
        'Innovative Solutions',
        'accepted'
      );

      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.html).toContain('Alice Johnson');
      expect(mailCall.html).toContain('Full Stack Developer');
      expect(mailCall.html).toContain('Innovative Solutions');
    });

    test('should handle long job titles', async () => {
      const longTitle = 'Senior Full Stack Software Development Engineer with Cloud Architecture Specialization';
      
      await sendJobStatusEmail(
        'test@example.com',
        'John Doe',
        longTitle,
        'Tech Corp',
        'accepted'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `Congratulations! Shortlisted for ${longTitle}`
        })
      );
    });

    test('should handle special characters in name', async () => {
      await sendJobStatusEmail(
        'test@example.com',
        'María José O\'Connor-Smith',
        'Developer',
        'Company',
        'accepted'
      );

      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.html).toContain('María José O\'Connor-Smith');
    });

    test('should call sendMail exactly once per email', async () => {
      await sendJobStatusEmail(
        'test1@example.com',
        'User One',
        'Job A',
        'Company A',
        'accepted'
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      
      await sendJobStatusEmail(
        'test2@example.com',
        'User Two',
        'Job B',
        'Company B',
        'rejected'
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test.skip('should use correct transporter configuration', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@gmail.com',
          pass: 'test-pass',
        },
      });
    });
  });
});