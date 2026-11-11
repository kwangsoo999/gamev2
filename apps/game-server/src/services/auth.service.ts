import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { JsonStore } from '../database/jsonStore.js';
import { ENV } from '../config/env.js';

interface FailedAttemptEntry {
  count: number;
  lockedUntilMs: number;
}

interface PasswordResetRecord {
  userId: string;
  codeHash: string;
  expiresAtMs: number;
}

export interface ActiveSessionRecord {
  jti: string;
  userId: string;
  username: string;
  createdAt: string;
  expiresAtMs: number;
  revoked: boolean;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 60_000;
const RESET_TTL_MS = 10 * 60_000;

export class AuthService {
  private static instance: AuthService;
  private store = JsonStore.getInstance();
  private failedAttempts = new Map<string, FailedAttemptEntry>();
  private resetRequests = new Map<string, PasswordResetRecord>();
  private sessions = new Map<string, ActiveSessionRecord>();
  private revokedJtis = new Set<string>();

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private signUserToken(user: { id: string; username: string; role: string }) {
    const jti = randomUUID();
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, jti },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );
    const decoded: any = jwt.decode(token) || {};
    const expMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 3600_000;
    this.sessions.set(jti, {
      jti,
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
      expiresAtMs: expMs,
      revoked: false,
    });
    return token;
  }

  public isTokenRevoked(jti?: string): boolean {
    if (!jti) return false;
    return this.revokedJtis.has(jti);
  }

  public logout(jti?: string, userId?: string) {
    if (jti) {
      this.revokedJtis.add(jti);
      const rec = this.sessions.get(jti);
      if (rec) rec.revoked = true;
    } else if (userId) {
      for (const [id, rec] of this.sessions.entries()) {
        if (rec.userId === userId) {
          rec.revoked = true;
          this.revokedJtis.add(id);
        }
      }
    }
    return { loggedOut: true };
  }

  public listActiveSessions(userId: string) {
    const now = Date.now();
    return [...this.sessions.values()].filter(
      (s) => s.userId === userId && !s.revoked && s.expiresAtMs > now
    );
  }

  async register(username: string, email: string, password: string) {
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Dữ liệu đăng ký không hợp lệ.');
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(cleanUsername)) {
      throw new Error('Tên tài khoản phải có 3–20 ký tự, chỉ gồm chữ, số, _ hoặc -.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự và không vượt quá giới hạn an toàn.');
    }

    if (this.store.users.find((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error('Tên tài khoản đã tồn tại.');
    }
    if (this.store.users.find((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Email này đã được sử dụng.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `USR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: 'player',
      createdAt: new Date().toISOString(),
    };

    this.store.users.push(newUser);
    this.store.save();

    const token = this.signUserToken(newUser);
    const userPayload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    };

    return {
      token,
      account: userPayload,
      user: userPayload,
    };
  }

  async login(usernameOrEmail: string, password: string) {
    if (!usernameOrEmail || !password) {
      throw new Error('Vui lòng nhập tài khoản và mật khẩu.');
    }
    const clean = usernameOrEmail.trim().toLowerCase();
    const user = this.store.users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    const lockKey = user ? user.id : clean;
    const attempt = this.failedAttempts.get(lockKey);
    if (attempt && attempt.lockedUntilMs > Date.now()) {
      const waitSec = Math.ceil((attempt.lockedUntilMs - Date.now()) / 1000);
      throw new Error(`Tài khoản tạm khóa bảo vệ do nhập sai nhiều lần. Vui lòng thử lại sau ${waitSec}s.`);
    }

    const isMatch = user && user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !isMatch) {
      const prevCount = attempt && attempt.lockedUntilMs <= Date.now() ? attempt.count : 0;
      const nextCount = prevCount + 1;
      this.failedAttempts.set(lockKey, {
        count: nextCount,
        lockedUntilMs: nextCount >= MAX_FAILED_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCK_DURATION_MS : 0,
      });
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    this.failedAttempts.delete(lockKey);
    this.failedAttempts.delete(clean);
    user.lastLoginAt = new Date().toISOString();
    this.store.save();

    const token = this.signUserToken(user);
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return {
      token,
      account: userPayload,
      user: userPayload,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) throw new Error('Không tìm thấy tài khoản.');
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new Error('Mật khẩu mới phải từ 8 đến 72 ký tự.');
    }
    if (user.passwordHash) {
      const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
      if (!ok) throw new Error('Mật khẩu hiện tại không chính xác.');
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordUpdatedAt = new Date().toISOString();
    this.store.save();
    return { updated: true };
  }

  async requestPasswordReset(usernameOrEmail: string) {
    const clean = String(usernameOrEmail || '').trim().toLowerCase();
    const user = this.store.users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    if (!user) {
      throw new Error('Không tìm thấy tài khoản hoặc email tương ứng.');
    }
    const rawCode = randomBytes(3).toString('hex').toUpperCase();
    const codeHash = createHash('sha256').update(rawCode).digest('hex');
    this.resetRequests.set(clean, {
      userId: user.id,
      codeHash,
      expiresAtMs: Date.now() + RESET_TTL_MS,
    });
    return {
      message: 'Mã khôi phục mật khẩu đã được tạo (hiệu lực 10 phút).',
      // Only exposed in non-production environments for QA & test verification
      ...(process.env.NODE_ENV !== 'production' ? { devResetCode: rawCode } : {}),
    };
  }

  async confirmPasswordReset(usernameOrEmail: string, resetCode: string, newPassword: string) {
    const clean = String(usernameOrEmail || '').trim().toLowerCase();
    const rec = this.resetRequests.get(clean);
    if (!rec || rec.expiresAtMs < Date.now()) {
      this.resetRequests.delete(clean);
      throw new Error('Mã khôi phục không tồn tại hoặc đã hết hạn.');
    }
    const codeHash = createHash('sha256').update(String(resetCode || '').trim().toUpperCase()).digest('hex');
    if (codeHash !== rec.codeHash) {
      throw new Error('Mã khôi phục mật khẩu không chính xác.');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new Error('Mật khẩu mới phải từ 8 đến 72 ký tự.');
    }
    const user = this.store.users.find((u) => u.id === rec.userId);
    if (!user) throw new Error('Tài khoản không tồn tại.');
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordUpdatedAt = new Date().toISOString();
    this.resetRequests.delete(clean);
    this.failedAttempts.delete(clean);
    this.failedAttempts.delete(user.id);
    this.failedAttempts.delete(user.username.toLowerCase());
    this.failedAttempts.delete(user.email.toLowerCase());
    this.store.save();
    return { reset: true, username: user.username };
  }

  async createGuestSession() {
    const stamp = Date.now().toString(36);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const username = `guest_${stamp}_${rand}`;
    const newUser = {
      id: `USR_${Date.now()}_${rand}`,
      username,
      email: `${username}@guest.elysia.local`,
      passwordHash: '',
      role: 'player',
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(newUser);
    this.store.save();

    const token = this.signUserToken(newUser);
    const userPayload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    };

    return {
      token,
      account: userPayload,
      user: userPayload,
    };
  }
}
