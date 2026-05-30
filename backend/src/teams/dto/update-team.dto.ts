import { IsString, Length } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @Length(2, 30, { message: '团队名长度需在 2~30 个字符之间' })
  name!: string;
}

