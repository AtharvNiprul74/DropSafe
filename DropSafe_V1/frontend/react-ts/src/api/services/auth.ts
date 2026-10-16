import { EP } from '../endpoints';
import { get, post } from '../http';
import type { LoginResponse, SessionUser } from '../../types/models';

export const login = (email: string, password: string) => post<LoginResponse>(EP.login.path, { email, password });
export const me = () => get<SessionUser>(EP.me.path);
export const logout = () => post(EP.logout.path);
