import { Evaluation, PracticeMessage, PracticeSession, Scenario } from '@prisma/client';

export type PracticeSessionDetail = PracticeSession & {
  scenario: Scenario;
  messages: PracticeMessage[];
  evaluations: Evaluation[];
};
