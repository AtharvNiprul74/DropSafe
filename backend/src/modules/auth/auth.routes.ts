import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/auth';
import { authRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public routes with specific auth rate limiting
router.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', authRateLimiter, (req, res, next) => authController.refresh(req, res, next));

// Authenticated routes
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.post('/change-password', authenticate, (req, res, next) => authController.changePassword(req, res, next));

export default router;
