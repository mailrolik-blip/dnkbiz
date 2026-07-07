export class CostBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostBudgetExceededError";
  }
}
