import { IsString, Length } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @Length(1, 64, { message: 'targetUserId 长度非法' })
  targetUserId!: string;
}

