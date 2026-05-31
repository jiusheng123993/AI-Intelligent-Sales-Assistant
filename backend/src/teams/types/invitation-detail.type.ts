﻿import { UserRole } from '@prisma/client';

export type InvitationStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface InvitationDetail {
  id: string;
  code: string;
  teamId: string;
  role: UserRole;
  invitedBy: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedById: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  status: InvitationStatus;
}
