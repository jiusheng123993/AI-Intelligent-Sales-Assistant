import { IsString, Matches } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @Matches(/^[A-Z2-7]{16}$/, { message: '邀请码格式非法' })
  code!: string;
}

