import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.validation';
import { sendSuccess } from '../../core/utils/response';
import { UnauthorizedError } from '../../core/errors/AppError';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated, req.ip, req.get('user-agent'));
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(validated);
      sendSuccess(res, result, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }
      const profile = await authService.getMe(req.user.userId);
      sendSuccess(res, profile, 'User profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }
      const validated = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user.userId, validated);
      sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
