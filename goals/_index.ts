import type { GoalFunctionArgs } from '../src/types';
import voteOnRubyGoal from './vote-on-ruby';

export function executeGoal(
  goalName: string,
  goalArgs: GoalFunctionArgs<string[]>
): Promise<void> {
  switch (goalName) {
    case 'vote-on-ruby':
      return voteOnRubyGoal(goalArgs as GoalFunctionArgs<['string', 'string']>);
    default:
      throw new Error(`Goal not found: ${goalName}`);
  }
}
