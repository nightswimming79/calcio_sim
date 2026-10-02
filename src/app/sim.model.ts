// ============================================================================
// 1. STATISTICHE SQUADRA E ASSETTO TATTICO
// ============================================================================

import { SIM_CONFIG } from "./config/sim-config.const";

export interface TeamStatsInit {
  midfield: number;
  playmaking: number;
  attack: number;
  defense: number;
  pressing: number;
  goalkeeper: number;
  cornerAttack: number;
  cornerDefense: number;
}

export class TeamStats {
  private _midfield: number;
  private _playmaking: number;
  private _attack: number;
  private _defense: number;
  private _pressing: number;
  private _goalkeeper: number;
  private _cornerAttack: number;
  private _cornerDefense: number;

  constructor(init: TeamStatsInit) {
    this._midfield = init.midfield;
    this._playmaking = init.playmaking;
    this._attack = init.attack;
    this._defense = init.defense;
    this._pressing = init.pressing;
    this._goalkeeper = init.goalkeeper;
    this._cornerAttack = init.cornerAttack;
    this._cornerDefense = init.cornerDefense;
  }

  // Clamping per assicurare valori sempre tra 0 e 100
  private calc(base: number, multiplier: number): number {
    return Math.min(100, Math.max(0, base * multiplier));
  }

  // --- GETTER CON MOLTIPLICATORI DA SIM_CONFIG ---
  get midfield(): number {
    return this.calc(this._midfield, SIM_CONFIG.STAT_MULTIPLIERS.midfield);
  }
  get playmaking(): number {
    return this.calc(this._playmaking, SIM_CONFIG.STAT_MULTIPLIERS.playmaking);
  }
  get attack(): number {
    return this.calc(this._attack, SIM_CONFIG.STAT_MULTIPLIERS.attack);
  }
  get defense(): number {
    return this.calc(this._defense, SIM_CONFIG.STAT_MULTIPLIERS.defense);
  }
  get pressing(): number {
    return this.calc(this._pressing, SIM_CONFIG.STAT_MULTIPLIERS.pressing);
  }
  get goalkeeper(): number {
    return this.calc(this._goalkeeper, SIM_CONFIG.STAT_MULTIPLIERS.goalkeeper);
  }
  get cornerAttack(): number {
    return this.calc(this._cornerAttack, SIM_CONFIG.STAT_MULTIPLIERS.cornerAttack);
  }
  get cornerDefense(): number {
    return this.calc(this._cornerDefense, SIM_CONFIG.STAT_MULTIPLIERS.cornerDefense);
  }

  // --- GETTER VALORI BASE (UTILI PER UI/EDITOR) ---
  get baseMidfield(): number { return this._midfield; }
  get basePlaymaking(): number { return this._playmaking; }
  get baseAttack(): number { return this._attack; }
  get baseDefense(): number { return this._defense; }
  get basePressing(): number { return this._pressing; }
  get baseGoalkeeper(): number { return this._goalkeeper; }
  get baseCornerAttack(): number { return this._cornerAttack; }
  get baseCornerDefense(): number { return this._cornerDefense; }
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