import { Request, Response, NextFunction } from 'express';

export const sseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.flushHeaders();

  const keepAliveInterval = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  (req as any).keepAliveInterval = keepAliveInterval;

  res.on('close', () => {
    clearInterval(keepAliveInterval);
    res.end();
  });

  next();
};