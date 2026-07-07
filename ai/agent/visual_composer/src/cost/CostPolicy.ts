import { CostBudgetExceededError } from "./CostBudgetExceededError";

export interface CostPolicyInput {
  max_ai_image_calls_per_job: number;
  allow_automatic_retry: boolean;
  require_explicit_paid_retry: boolean;
}

export class CostPolicy {
  private attempted = 0;

  constructor(private readonly policy: CostPolicyInput) {}

  get attemptedCalls(): number {
    return this.attempted;
  }

  authorizeImageCall(input: { estimated_calls?: number; explicit_paid_action?: boolean; reason: string }): void {
    const estimated = input.estimated_calls ?? 1;
    if (estimated <= 0) return;
    if (this.attempted + estimated > this.policy.max_ai_image_calls_per_job) {
      throw new CostBudgetExceededError(`AI image call budget exceeded for ${input.reason}. attempted=${this.attempted} estimated=${estimated} max=${this.policy.max_ai_image_calls_per_job}`);
    }
    if (this.attempted > 0 && this.policy.require_explicit_paid_retry && !input.explicit_paid_action) {
      throw new CostBudgetExceededError(`Second AI image call requires explicit paid action: ${input.reason}`);
    }
    if (this.attempted > 0 && !this.policy.allow_automatic_retry && !input.explicit_paid_action) {
      throw new CostBudgetExceededError(`Automatic AI retry is disabled: ${input.reason}`);
    }
    this.attempted += estimated;
  }
}
