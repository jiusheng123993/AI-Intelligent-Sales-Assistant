/**
 * 练习会话详情类型。
 * 在 Prisma 自动生成的 PracticeSession 基础上拼接关联：场景、消息、评估。
 */
import { Evaluation, PracticeMessage, PracticeSession, Scenario } from '@prisma/client';

export type PracticeSessionDetail = PracticeSession & {
  scenario: Scenario;
  messages: PracticeMessage[];
  evaluations: Evaluation[];
};
