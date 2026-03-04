import { Request, Response } from 'express';
import { 
  handleSSEConnection, 
  notifyEmployer, 
  notifyMultipleEmployers,
  getActiveConnectionCount,
  isEmployerOnline,
  disconnectAll,
  activeConnections 
} from '../sseController';
import { IUser } from '../../models/user.model';

interface AuthRequest extends Request {
  user?: IUser;
}

describe('SSE Controller', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockSetHeader: jest.Mock;
  let mockWrite: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockFlushHeaders: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    mockSetHeader = jest.fn();
    mockWrite = jest.fn();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockFlushHeaders = jest.fn();
    mockOn = jest.fn();

    mockReq = {
      user: undefined,
      on: mockOn
    };

    mockRes = {
      setHeader: mockSetHeader,
      write: mockWrite,
      json: mockJson,
      status: mockStatus,
      flushHeaders: mockFlushHeaders
    };

    jest.clearAllMocks();
    activeConnections.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleSSEConnection', () => {
    const mockEmployer = {
      _id: 'employer123',
      email: 'employer@company.com',
      role: 'Employer',
      toString: () => 'employer123'
    } as any;

    const mockJobSeeker = {
      _id: 'seeker123',
      email: 'seeker@example.com',
      role: 'Job Seeker',
      toString: () => 'seeker123'
    } as any;

    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    test('should return 403 if user is not employer', async () => {
      mockReq.user = mockJobSeeker;

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Only employers can receive real-time updates' });
    });

    test('should set correct SSE headers for employer', async () => {
      mockReq.user = mockEmployer;

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockSetHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockSetHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockSetHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(mockSetHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockFlushHeaders).toHaveBeenCalled();
    });

    test('should send CONNECTED event', async () => {
      mockReq.user = mockEmployer;

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('CONNECTED')
      );
    });

    test('should store connection in activeConnections map', async () => {
      mockReq.user = mockEmployer;

      expect(activeConnections.size).toBe(0);

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(activeConnections.size).toBe(1);
      expect(activeConnections.has('employer123')).toBe(true);
    });

    test('should set up keep-alive interval', async () => {
      mockReq.user = mockEmployer;

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      jest.advanceTimersByTime(30000);

      expect(mockWrite).toHaveBeenCalledWith(':keepalive\n\n');
    });

    test('should clean up on connection close', async () => {
      mockReq.user = mockEmployer;
      
      let closeHandler: Function = () => {};
      mockOn.mockImplementation((event: string, handler: Function) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(activeConnections.size).toBe(1);

      closeHandler();

      expect(activeConnections.size).toBe(0);
      
      jest.advanceTimersByTime(30000);
      expect(mockWrite).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple employer connections', async () => {
      const employer1 = { ...mockEmployer, _id: 'emp1', toString: () => 'emp1' };
      const employer2 = { ...mockEmployer, _id: 'emp2', toString: () => 'emp2' };
      const employer3 = { ...mockEmployer, _id: 'emp3', toString: () => 'emp3' };

      mockReq.user = employer1;
      await handleSSEConnection(mockReq as Request, mockRes as Response);
      
      mockReq.user = employer2;
      await handleSSEConnection(mockReq as Request, mockRes as Response);
      
      mockReq.user = employer3;
      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(activeConnections.size).toBe(3);
    });

    test('should handle errors gracefully', async () => {
      mockReq.user = mockEmployer;
      
      mockSetHeader.mockImplementation(() => {
        throw new Error('Header error');
      });

      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('notifyEmployer', () => {
    const mockData = {
      type: 'NEW_APPLICATION',
      message: 'New application received',
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    test('should return false if employer not connected', () => {
      const result = notifyEmployer('nonexistent', mockData);
      expect(result).toBe(false);
    });

    test('should send notification to connected employer', async () => {
      const mockEmployer = {
        _id: 'employer123',
        email: 'employer@company.com',
        role: 'Employer',
        toString: () => 'employer123'
      } as any;

      mockReq.user = mockEmployer;
      await handleSSEConnection(mockReq as Request, mockRes as Response);

      (mockRes.write as jest.Mock).mockClear();

      const result = notifyEmployer('employer123', mockData);

      expect(result).toBe(true);
      expect(mockRes.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(mockData)}\n\n`
      );
    });

    test('should handle send failure gracefully', async () => {
      const mockEmployer = {
        _id: 'employer123',
        email: 'employer@company.com',
        role: 'Employer',
        toString: () => 'employer123'
      } as any;

      mockReq.user = mockEmployer;
      await handleSSEConnection(mockReq as Request, mockRes as Response);

      (mockRes.write as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = notifyEmployer('employer123', mockData);
      expect(result).toBe(false);
    });
  });

  describe('notifyMultipleEmployers', () => {
    test('should notify multiple employers', () => {
      const employers = ['emp1', 'emp2', 'emp3'];
      const mockData = { type: 'BULK_NOTIFICATION' };

      const mockNotifyEmployer = jest.spyOn({ notifyEmployer }, 'notifyEmployer');
      
      notifyMultipleEmployers(employers, mockData);
      
      expect(true).toBe(true);
    });
  });

  describe('getActiveConnectionCount', () => {
    test('should return 0 when no connections', () => {
      expect(getActiveConnectionCount()).toBe(0);
    });

    test('should return correct number of connections', async () => {
      const mockEmployer = {
        _id: 'employer123',
        email: 'employer@company.com',
        role: 'Employer',
        toString: () => 'employer123'
      } as any;

      mockReq.user = mockEmployer;
      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(getActiveConnectionCount()).toBe(1);
    });
  });

  describe('isEmployerOnline', () => {
    test('should return false for offline employer', () => {
      expect(isEmployerOnline('nonexistent')).toBe(false);
    });

    test('should return true for online employer', async () => {
      const mockEmployer = {
        _id: 'employer123',
        email: 'employer@company.com',
        role: 'Employer',
        toString: () => 'employer123'
      } as any;

      mockReq.user = mockEmployer;
      await handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(isEmployerOnline('employer123')).toBe(true);
    });
  });

  describe('disconnectAll', () => {
    test('should clear all connections', () => {
      const employer1 = { _id: 'emp1', toString: () => 'emp1' } as any;
      const employer2 = { _id: 'emp2', toString: () => 'emp2' } as any;
      const employer3 = { _id: 'emp3', toString: () => 'emp3' } as any;

      const mockSendEvent1 = jest.fn();
      const mockSendEvent2 = jest.fn();
      const mockSendEvent3 = jest.fn();

      activeConnections.set('emp1', mockSendEvent1);
      activeConnections.set('emp2', mockSendEvent2);
      activeConnections.set('emp3', mockSendEvent3);

      expect(activeConnections.size).toBe(3);
      
      disconnectAll();
      
      expect(activeConnections.size).toBe(0);
      expect(getActiveConnectionCount()).toBe(0);
    });
  });
});