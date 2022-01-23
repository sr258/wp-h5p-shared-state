declare namespace Express {
  interface Request {
    user?: {
      username?: string;
      displayName?: string;
      email?: string;
      id?: string;
      permission?: "privileged" | "user";
    };
  }
}
