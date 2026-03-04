import axios from 'axios';
import pdf from 'pdf-parse';
import { ResumeParserService, ParsedResume } from '../resumeParser.service';

// Mock dependencies
jest.mock('axios');
jest.mock('pdf-parse');
jest.mock('form-data');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockPdfParse = pdf as jest.MockedFunction<typeof pdf>;

describe('ResumeParserService', () => {
  let service: ResumeParserService;
  const mockPdfBuffer = Buffer.from('mock pdf content');
  const mockFileName = 'resume.pdf';

  beforeEach(() => {
    // Set environment variables
    process.env.APILAYER_API_KEY = 'test-api-key';
    process.env.APILAYER_API_URL = 'https://test-api.com/parse';

    service = new ResumeParserService();
    jest.clearAllMocks();
  });

  describe('parseResume', () => {
    const mockApilayerResponse = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: '123 Main St, Bangalore',
      skills: ['JavaScript', 'React', 'Node.js'],
      experience: [
        { company: 'Tech Corp', position: 'Developer', duration: '2 years' }
      ],
      education: [
        { degree: 'B.Tech', institution: 'University', year: '2020' }
      ]
    };

    test('should use apilayer parser when API key exists and succeeds', async () => {
      // Mock axios post to succeed
      mockAxios.post.mockResolvedValue({
        data: mockApilayerResponse
      });

      const result = await service.parseResume(mockPdfBuffer, mockPdfBuffer, mockFileName);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://test-api.com/parse',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'apikey': 'test-api-key'
          })
        })
      );

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St, Bangalore',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: [
          { company: 'Tech Corp', role: 'Developer', duration: '2 years' }
        ],
        education: [
          { degree: 'B.Tech', institution: 'University', year: '2020' }
        ]
      });
    });

    test('should fallback to local parser when apilayer returns "Not found" name', async () => {
      // Mock apilayer to return incomplete data
      mockAxios.post.mockResolvedValue({
        data: { ...mockApilayerResponse, name: 'Not found' }
      });

      // Mock pdf-parse for fallback
      const mockPdfData = {
        text: `
          John Smith
          john.smith@email.com
          9876543210
          Bangalore
          Skills: JavaScript, React, Node.js
        `
      };
      mockPdfParse.mockResolvedValue(mockPdfData as any);

      const result = await service.parseResume(mockPdfBuffer, mockPdfBuffer, mockFileName);

      expect(result.name).toBe('Not found');
      expect(result.email).toBe('john.smith@email.com');
      expect(result.phone).toBe('9876543210');
      expect(result.address).toBe('Bangalore');
      expect(result.skills).toContain('JavaScript');
    });

    test('should fallback to local parser when apilayer fails', async () => {
      // Mock apilayer to fail
      mockAxios.post.mockRejectedValue(new Error('API error'));

      // Mock pdf-parse for fallback
      const mockPdfData = {
        text: `
          Jane Doe
          jane@company.com
          1234567890
          Mumbai
          Skills: Python, Django, PostgreSQL
        `
      };
      mockPdfParse.mockResolvedValue(mockPdfData as any);

      const result = await service.parseResume(mockPdfBuffer, mockPdfBuffer, mockFileName);

      expect(mockPdfParse).toHaveBeenCalledWith(mockPdfBuffer);
      expect(result.email).toBe('jane@company.com');
      expect(result.phone).toBe('1234567890');
      expect(result.address).toBe('Mumbai');
      expect(result.skills).toContain('Python');
    });

    test('should return empty response when no API key and fallback buffer empty', async () => {
      delete process.env.APILAYER_API_KEY;
      service = new ResumeParserService();

      const result = await service.parseResume(mockPdfBuffer, Buffer.from([]), mockFileName);

      expect(result).toEqual({
        name: 'Not found',
        email: 'Not found',
        phone: 'Not found',
        address: '',
        skills: [],
        experience: [],
        education: []
      });
    });

    test('should handle apilayer timeout', async () => {
      mockAxios.post.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

      const mockPdfData = {
        text: 'Fallback content\nemail@test.com\n9876543210'
      };
      mockPdfParse.mockResolvedValue(mockPdfData as any);

      const result = await service.parseResume(mockPdfBuffer, mockPdfBuffer, mockFileName);

      expect(result.email).toBe('email@test.com');
    });
  });

  describe('extractName', () => {
    let service: ResumeParserService;
    
    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should extract name from beginning of text', () => {
      const text = 'John Doe\nSoftware Engineer\njohn@email.com';
      const name = (service as any).extractName(text);
      expect(name).toBe('John Doe');
    });

    test('should extract name with "Name:" label', () => {
      const text = 'Name: Jane Smith\nEmail: jane@email.com';
      const name = (service as any).extractName(text);
      expect(name).toBe('Jane Smith');
    });

    test('should return null if no valid name found', () => {
      const text = 'Just some random text without a proper name';
      const name = (service as any).extractName(text);
      expect(name).toBeNull();
    });

    test('should ignore email addresses as names', () => {
      const text = 'user@email.com is my email';
      const name = (service as any).extractName(text);
      expect(name).toBeNull();
    });
  });

  describe('extractEmail', () => {
    let service: ResumeParserService;

    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should extract standard email', () => {
      const text = 'Contact: john.doe@example.com';
      const email = (service as any).extractEmail(text);
      expect(email).toBe('john.doe@example.com');
    });

    test('should extract email with plus sign', () => {
      const text = 'Email: john+test@gmail.com';
      const email = (service as any).extractEmail(text);
      expect(email).toBe('john+test@gmail.com');
    });

    test('should return null if no email', () => {
      const text = 'No email address here';
      const email = (service as any).extractEmail(text);
      expect(email).toBeNull();
    });
  });

  describe('extractPhone', () => {
    let service: ResumeParserService;

    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should extract 10-digit Indian mobile', () => {
      const text = 'Phone: 9876543210';
      const phone = (service as any).extractPhone(text);
      expect(phone).toBe('9876543210');
    });

    test('should extract phone with country code', () => {
      const text = 'Phone: +91 9876543210';
      const phone = (service as any).extractPhone(text);
      expect(phone).toBe('+91 9876543210');
    });

    test('should extract phone with hyphens', () => {
      const text = 'Phone: 123-456-7890';
      const phone = (service as any).extractPhone(text);
      expect(phone).toBe('123-456-7890');
    });

    test('should return null if no phone', () => {
      const text = 'No phone number here';
      const phone = (service as any).extractPhone(text);
      expect(phone).toBeNull();
    });
  });

  describe('extractAddress', () => {
    let service: ResumeParserService;

    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should extract line containing city name', () => {
      const text = '123 Main Street\nBangalore, Karnataka\nEmail: test@email.com';
      const address = (service as any).extractAddress(text);
      expect(address).toBe('Bangalore, Karnataka');
    });

    test('should return empty string if no city found', () => {
      const text = 'No city mentioned in this text';
      const address = (service as any).extractAddress(text);
      expect(address).toBe('');
    });

    test('should detect multiple city names', () => {
      const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
      
      for (const city of cities) {
        const text = `Address: 123 ${city} Main Road`;
        const address = (service as any).extractAddress(text);
        expect(address).toBe(`Address: 123 ${city} Main Road`);
      }
    });
  });

  describe('extractSkills', () => {
    let service: ResumeParserService;

    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should extract matching skills from text', () => {
      const text = 'I know JavaScript, React, and Node.js. Also familiar with Python.';
      const skills = (service as any).extractSkills(text);
      
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
      expect(skills).toContain('Python');
      expect(skills).not.toContain('Java');
    });

    test('should handle case-insensitive matching', () => {
      const text = 'skills: javascript, REACT, node.js';
      const skills = (service as any).extractSkills(text);
      
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
    });

    test('should return empty array when no skills match', () => {
      const text = 'No technical skills mentioned';
      const skills = (service as any).extractSkills(text);
      expect(skills).toEqual([]);
    });

    test('should handle C++ skill correctly', () => {
      const text = 'Proficient in C++ and Java';
      const skills = (service as any).extractSkills(text);
      
      expect(skills).toContain('C\\+\\+');
      expect(skills).toContain('Java');
    });
  });

  describe('transformApilayerResponse', () => {
    let service: ResumeParserService;

    beforeEach(() => {
      service = new ResumeParserService();
    });

    test('should transform standard apilayer response', () => {
      const apiData = {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '1234567890',
        address: 'Test Address',
        skills: ['Skill1', 'Skill2'],
        experience: [
          { company: 'C1', position: 'P1', duration: '2y' }
        ],
        education: [
          { degree: 'BSc', institution: 'Uni', year: '2020' }
        ]
      };

      const result = (service as any).transformApilayerResponse(apiData);

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@test.com',
        phone: '1234567890',
        address: 'Test Address',
        skills: ['Skill1', 'Skill2'],
        experience: [{ company: 'C1', role: 'P1', duration: '2y' }],
        education: [{ degree: 'BSc', institution: 'Uni', year: '2020' }]
      });
    });

    test('should handle alternative field names', () => {
      const apiData = {
        full_name: 'Jane Smith',
        mobile_number: '9876543210',
        location: 'New York',
        experience: [
          { company: 'C1', title: 'Developer', period: '2020-2022' }
        ],
        education: [
          { qualification: 'MSc', university: 'NYU', graduation_year: '2019' }
        ]
      };

      const result = (service as any).transformApilayerResponse(apiData);

      expect(result.name).toBe('Jane Smith');
      expect(result.phone).toBe('9876543210');
      expect(result.address).toBe('New York');
      expect(result.experience[0].role).toBe('Developer');
      expect(result.experience[0].duration).toBe('2020-2022');
      expect(result.education[0].degree).toBe('MSc');
      expect(result.education[0].institution).toBe('NYU');
      expect(result.education[0].year).toBe('2019');
    });

    test('should handle missing fields with defaults', () => {
      const apiData = {};

      const result = (service as any).transformApilayerResponse(apiData);

      expect(result.name).toBe('Not found');
      expect(result.email).toBe('Not found');
      expect(result.phone).toBe('Not found');
      expect(result.address).toBe('');
      expect(result.skills).toEqual([]);
      expect(result.experience).toEqual([]);
      expect(result.education).toEqual([]);
    });
  });

  describe('getEmptyResponse', () => {
    test('should return empty response structure', () => {
      const service = new ResumeParserService();
      const result = service['getEmptyResponse']();

      expect(result).toEqual({
        name: 'Not found',
        email: 'Not found',
        phone: 'Not found',
        address: '',
        skills: [],
        experience: [],
        education: []
      });
    });
  });
});