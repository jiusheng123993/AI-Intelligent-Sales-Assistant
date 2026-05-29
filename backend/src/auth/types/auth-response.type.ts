import { SafeUser } from '../../users/types/safe-user.type';

export type AuthResponse = {
  accessToken: string;
  user: SafeUser;
};
