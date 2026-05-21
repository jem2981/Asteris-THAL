import type { AgentState, IdentityKernel } from "./types.js";

export class StateMachine {
  constructor(private readonly identity: IdentityKernel) {}

  get state(): AgentState {
    return this.identity.state;
  }

  transition(nextState: AgentState): { previousState: AgentState; nextState: AgentState } {
    const previousState = this.identity.state;
    this.identity.state = nextState;
    return { previousState, nextState };
  }

  tryReturnToStable(hasLoggedClarification: boolean): boolean {
    if (!hasLoggedClarification) {
      return false;
    }
    this.transition("ACTIVE_STABLE");
    return true;
  }
}
