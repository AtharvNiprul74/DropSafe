import bcrypt from 'bcryptjs';
import { securityConfig } from '../../config/security';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(securityConfig.bcrypt.saltRounds);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
