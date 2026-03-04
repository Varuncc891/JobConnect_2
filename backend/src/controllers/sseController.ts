import { Request, Response } from 'express';
import { IUser } from '../models/user.model';

interface AuthRequest extends Request {
  user?: IUser;
}

// Active SSE connections: key = employerId, value = event sender function
export const activeConnections = new Map<string, (data: any) => void>();

export const handleSSEConnection = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (user.role !== 'Employer') {
      res.status(403).json({ message: 'Only employers can receive real-time updates' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.flushHeaders();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent({
      type: 'CONNECTED',
      message: 'Connected to real-time updates',
      timestamp: new Date().toISOString(),
    });

    const keepAliveInterval = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);

    const employerId = user._id.toString();
    activeConnections.set(employerId, sendEvent);

    console.log(`Employer connected: ${user.email} (${employerId}) | Active: ${activeConnections.size}`);

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      activeConnections.delete(employerId);
      console.log(`Employer disconnected: ${user.email} | Active: ${activeConnections.size}`);
    });
  } catch (error) {
    console.error('SSE Connection Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const notifyEmployer = (employerId: string, data: any): boolean => {
  const sendEvent = activeConnections.get(employerId);

  if (sendEvent) {
    try {
      sendEvent(data);
      return true;
    } catch (error) {
      console.error(`Failed to send notification to ${employerId}:`, error);
      return false;
    }
  }

  return false;
};

export const notifyMultipleEmployers = (employerIds: string[], data: any): void => {
  employerIds.forEach((id) => notifyEmployer(id, data));
};

export const getActiveConnectionCount = (): number => activeConnections.size;

export const isEmployerOnline = (employerId: string): boolean => activeConnections.has(employerId);

export const disconnectAll = (): void => {
  activeConnections.clear();
};