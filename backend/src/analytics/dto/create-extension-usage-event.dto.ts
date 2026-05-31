import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export type ExtensionUsageEventSource =
  | 'SIDEPANEL'
  | 'FLOATING_BUTTON'
  | 'CONTEXT_MENU'
  | 'COMMAND';
export type ExtensionUsageEventMode = 'suggest' | 'polish' | 'translate' | 'expand';
export type ExtensionUsageEventStatus = 'SUCCESS' | 'FAILED';

export class CreateExtensionUsageEventDto {
  @IsIn(['SIDEPANEL', 'FLOATING_BUTTON', 'CONTEXT_MENU', 'COMMAND'])
  source: ExtensionUsageEventSource;

  @IsIn(['suggest', 'polish', 'translate', 'expand'])
  mode: ExtensionUsageEventMode;

  @IsIn(['SUCCESS', 'FAILED'])
  status: ExtensionUsageEventStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300000)
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  pageHost?: string;
}
