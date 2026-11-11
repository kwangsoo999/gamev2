import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
  jti?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập (Thiếu Access Token).' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
    if (payload.jti && AuthService.getInstance().isTokenRevoked(payload.jti)) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối. Cần quyền Quản trị viên (Admin).' });
  }
  next();
}
