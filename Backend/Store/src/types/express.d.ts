import { Customer } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends Customer {}

    interface Request {
      user?: User;
    }
  }
}
