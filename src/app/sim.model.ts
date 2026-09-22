// ============================================================================
// 1. STATISTICHE SQUADRA E ASSETTO TATTICO
// ============================================================================

export interface TeamStats {
  midfield: number;       // 0 - 100
  playmaking: number;      // 0 - 100
  attack: number;          // 0 - 100
  defense: number;         // 0 - 100
  pressing: number;        // 0 - 100
  goalkeeper: number;      // 0 - 100
  cornerAttack: number;    // 0 - 100
  cornerDefense: number;   // 0 - 100
}

export interface PlaystyleConfig {
  verticality: number;     // 0.0 - 1.0
  defensiveLine: number;   // 0.0 - 1.0
}


// ============================================================================
// 2. MODULO AZIONE MANOVRATA (SIMULATE POSSESSION)
// ============================================================================

export interface SimulationInput {
  attackingTeam: TeamStats;
  defendingTeam: TeamStats;
  attackingPlaystyle?: PlaystyleConfig;
  defendingPlaystyle?: PlaystyleConfig;
  playstyle?: PlaystyleConfig;
}

export type ActionOutcome = 'CHANCE_CREATED' | 'COUNTER_ATTACK_RISK' | 'POSSESSION_RETAINED' | 'POSSESSION_LOST';

export interface ActionSimulationResult {
  outcome: ActionOutcome;
  xG: number;
  counterAttackRisk: number;
  highRecovery: boolean;
  completionProbability: number;
  passesCompleted?: number;
  generatedBaseXG?: number;
  currentPossession?: 'A' | 'B';
}


// ============================================================================
// 3. MODULO CONTROPIEDE (SIMULATE COUNTER ATTACK)
// ============================================================================

export interface CounterAttackInput {
  attackingTeam: TeamStats;
  defendingTeam: TeamStats;
  counterAttackRisk?: number;
  highRecovery?: boolean;
  attackingPlaystyle?: PlaystyleConfig;
  defendingPlaystyle?: PlaystyleConfig;
}

export type CounterAttackOutcome = 'COUNTER_SHOT' | 'COUNTER_CHANCE_CREATED' | 'COUNTER_FAILED';

export interface CounterAttackResult {
  outcome: CounterAttackOutcome;
  xG: number;
  breakthroughProbability: number;
  passesCompleted?: number;
  generatedBaseXG?: number;
}


// ============================================================================
// 4. MODULO SINGOLA AZIONE COMPLETA (SINGLE ACTION)
// ============================================================================

export interface SingleActionInput {
  teamA: TeamStats;
  playstyleA: PlaystyleConfig;
  teamB: TeamStats;
  playstyleB: PlaystyleConfig;
  startingPossession: 'A' | 'B';
}

export interface SingleActionResult {
  currentPossession: 'A' | 'B';
  xgTeamA: number;
  xgTeamB: number;
  outcome: 'CHANCE_CREATED' | 'COUNTER_CHANCE_CREATED' | 'COUNTER_FAILED' | 'POSSESSION_RETAINED';
}


// ============================================================================
// 5. MODULO CONCLUSIONE / TIRO (CALCULATE SHOT XG)
// ============================================================================

export interface ShotXGInput {
  baseXG: number;
  attacker: number;
  defender: number;
  goalkeeper: number;
}

export interface ShotXGResult {
  finalXG: number;
  isGoal: boolean;
  modifiers: {
    attackerBonus: number;
    defenderPenalty: number;
    goalkeeperPenalty: number;
  };
}

export type ShotOutcome =
  | 'GOAL'
  | 'SAVED_HELD'
  | 'SAVED_CORNER'
  | 'SAVED_REBOUND'
  | 'BLOCKED'
  | 'POST_BAR_REBOUND'
  | 'OUT';

export interface ExtendedShotXGResult {
  finalXG: number;
  outcome: ShotOutcome;
  nextState: 'OPPONENT_POSSESSION' | 'CORNER' | 'LOOSE_BALL';
  modifiers: {
    attackerBonus: number;
    defenderPenalty: number;
    goalkeeperPenalty: number;
  };
}


// ============================================================================
// 6. MODULO CALCIO D'ANGOLO (SIMULATE CORNER)
// ============================================================================

export interface CornerInput {
  attackerAerial: number;
  defenderAerial: number;
  goalkeeperExit: number;
}

export type CornerOutcome =
  | 'CORNER_SHOT'
  | 'CORNER_CLEARED_LOOSE'
  | 'CORNER_COUNTER_ATTACK'
  | 'CORNER_HELD';

export interface CornerResult {
  outcome: CornerOutcome;
  nextState: 'SHOT' | 'LOOSE_BALL' | 'COUNTER_ATTACK' | 'OPPONENT_POSSESSION';
  generatedBaseXG?: number;
}


// ============================================================================
// 7. MODULO PALLA CONTESA / SECONDA PALLA (SIMULATE LOOSE BALL)
// ============================================================================

export interface LooseBallInput {
  attackerReactivity: number;
  defenderReactivity: number;
  defensiveLine: number;
}

export type LooseBallOutcome =
  | 'REBOUND_SHOT'
  | 'ATTACK_RETAINED'
  | 'DEFENSE_CLEARED_LONG'
  | 'DEFENSE_RECOVERED';

export interface LooseBallResult {
  outcome: LooseBallOutcome;
  nextState: 'SHOT' | 'POSSESSION_RETAINED' | 'COUNTER_ATTACK' | 'OPPONENT_POSSESSION';
  generatedBaseXG?: number;
}