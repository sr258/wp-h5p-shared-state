declare namespace Express {
  interface Request {
    user?: {
      username?: string;
      displayName?: string;
      email?: string;
      id?: string;
      roles: string[];
      permissions: string[];
    };
  }
}
