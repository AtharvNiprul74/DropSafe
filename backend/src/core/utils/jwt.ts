import jwt from 'jsonwebtoken';
import { securityConfig } from '../../config/security';
import { AuthTokenPayload, RefreshTokenPayload } from '../types/context';
import { UnauthorizedError } from '../errors/AppError';

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, securityConfig.jwt.secret, {
    expiresIn: securityConfig.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, securityConfig.jwt.refreshSecret, {
    expiresIn: securityConfig.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, securityConfig.jwt.secret) as AuthTokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, securityConfig.jwt.refreshSecret) as RefreshTokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
