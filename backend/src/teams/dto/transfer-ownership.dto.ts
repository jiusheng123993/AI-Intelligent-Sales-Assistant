import { IsString, Matches } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @Matches(/^c[0-9a-z]{24}$/, { message: 'targetUserId 必须是合法 cuid' })
  targetUserId!: string;
}
