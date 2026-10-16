import { RequestUser, RequestTenant } from './context';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      tenant?: RequestTenant;
    }
  }
}

export {};
