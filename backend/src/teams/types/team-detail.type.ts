import { UserRole } from '@prisma/client';

export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface TeamDetail {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMemberSummary[];
  isOwner: boolean;
}

