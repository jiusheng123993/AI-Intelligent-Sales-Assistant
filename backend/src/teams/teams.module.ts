import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationService } from './invitation.service';
import { InvitationsController } from './invitations.controller';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController, InvitationsController],
  providers: [TeamsService, InvitationService],
  exports: [TeamsService, InvitationService],
})
export class TeamsModule {}

