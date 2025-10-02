// Extend Express Session types to include user

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      fullName?: string;
      role: string;
      [key: string]: any;
    };
  }
}

import { User } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    user?: Omit<User, 'password'>;
  }
}