import { User, UserRole } from '@prisma/client';

export type SafeUser = Omit<User, 'password'> & {
  role: UserRole;
};
