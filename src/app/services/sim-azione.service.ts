import { Injectable } from '@angular/core';
import {
  SimulationInput,
  ActionSimulationResult,
  CounterAttackInput,
  CounterAttackResult,
  ShotXGInput,
  ExtendedShotXGResult,
  CornerInput,
  CornerResult,
  LooseBallInput,
  LooseBallResult,
  TeamStats
} from '../sim.model';
import { SIM_CONFIG } from '../config/sim-config.const';

@Injectable({
  providedIn: 'root'
})
export class SimAzioneService {

  /**
   * Esegue N iterazioni di una simulazione passando l'input specificato.
   */
  public iterate<P, T>(
    simFn: (param: P) => T,
    iterations: number,
    input: P
  ): T[] {
    const results: T[] = [];
    for (let i = 0; i < iterations; i++) {
      results.push(simFn(input));
    }
    return results;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Simula la singola azione manovrata / possesso ordinario.
   */
  public simulatePossession(input: SimulationInput): ActionSimulationResult {
    const attackingTeam = input.attackingTeam;
    const defendingTeam = input.defendingTeam;

    const attackingPlaystyle = input.attackingPlaystyle ?? input.playstyle ?? { verticality: 0.5, defensiveLine: 0.5 };
    const defendingPlaystyle = input.defendingPlaystyle ?? { verticality: 0.5, defensiveLine: 0.5 };

    const v = this.clamp(attackingPlaystyle.verticality, 0, 1);
    const d = this.clamp(attackingPlaystyle.defensiveLine, 0, 1);
    const d_def = this.clamp(defendingPlaystyle.defensiveLine, 0, 1);

    const cfgP = SIM_CONFIG.POSSESSION;

    // --- PASSAGGI CONTINUI CON CURVA LOGARITMICA ---
    const basePasses = cfgP.BASE_PASSES_MAX - v * cfgP.PASSES_VERTICALITY_WEIGHT;
    const strengthPassMultiplier = this.calculatePassMultiplier(attackingTeam, defendingTeam, input.currentPassSequence);

    // Passaggi espressi in decimale continuo per evitare gradini nei calcoli aggregati
    const passesCompleted = basePasses * strengthPassMultiplier;

    const completionProbability = this.calculateCompletionProbability(attackingTeam, defendingTeam, v, d, input.currentPassSequence);
    const roll = Math.random();

    // ESITO 1: PALLA PERSA / RISCHIO CONTROPIEDE
    if (roll > completionProbability) {
      const isHighRecovery = d_def > cfgP.HIGH_RECOVERY_DEFENSIVE_LINE_THRESHOLD;

      const defenderWeight = cfgP.COUNTER_RISK_D_DEFENDER_WEIGHT ?? 0.3;

      const vRiskFactor = v + Math.pow(v - cfgP.SIMULATEPOSSESSION_ATT_V_OFFSET, cfgP.SIMULATEPOSSESSION_ATT_V_EXPONENT) * cfgP.SIMULATEPOSSESSION_ATT_V_SCALE;

      const counterRisk = this.clamp(
        (vRiskFactor * cfgP.COUNTER_RISK_V_WEIGHT + d * cfgP.COUNTER_RISK_D_WEIGHT + d_def * defenderWeight) * cfgP.COUNTER_RISK_MULTIPLIER,
        0,
        1
      );

      return {
        outcome: 'COUNTER_ATTACK_RISK',
        xG: -1,
        counterAttackRisk: Number(counterRisk.toFixed(2)),
        highRecovery: isHighRecovery,
        completionProbability: Number(completionProbability.toFixed(2)),
        passesCompleted: Number(passesCompleted.toFixed(2))
      };
    }

    // ESITO 2: SFONDAMENTO / OCCASIONE CREATA
    const spaceToExploit = (d_def - cfgP.SIMULATEPOSSESSION_D_DEF_OFFSET) * cfgP.SIMULATEPOSSESSION_D_DEF_SCALE;
    const supportFromBehind = (d - cfgP.SIMULATEPOSSESSION_D_ATT_OFFSET) * cfgP.SIMULATEPOSSESSION_D_ATT_SCALE;

    const chanceToBreakThrough = this.clamp(
      cfgP.BREAKTHROUGH_BASE
      + v * cfgP.BREAKTHROUGH_V_WEIGHT
      + spaceToExploit
      + supportFromBehind,
      cfgP.BREAKTHROUGH_MIN,
      cfgP.BREAKTHROUGH_MAX
    );
    const secondRoll = Math.random();

    if (secondRoll < chanceToBreakThrough) {
      const generatedXG = this.calculateGeneratedXG(attackingTeam, defendingTeam, v, d);
      const roundedXG = Number(generatedXG.toFixed(2));

      return {
        outcome: 'CHANCE_CREATED',
        xG: roundedXG,
        generatedBaseXG: roundedXG,
        counterAttackRisk: -1,
        highRecovery: false,
        completionProbability: Number(completionProbability.toFixed(2)),
        passesCompleted: Number(passesCompleted.toFixed(2))
      };
    }

    // ESITO 3: MANTENIMENTO POSSESSO
    return {
      outcome: 'POSSESSION_RETAINED',
      xG: -1,
      counterAttackRisk: -1,
      highRecovery: false,
      completionProbability: Number(completionProbability.toFixed(2)),
      passesCompleted: Number(passesCompleted.toFixed(2))
    };
  }

  private calculatePassMultiplier(
    attackingTeam: TeamStats,
    defendingTeam: TeamStats,
    currentPassSequence: number
  ): number {
    const cfgP = SIM_CONFIG.POSSESSION;
    const dynamicPlaymaking = attackingTeam.getPlaymaking(currentPassSequence);
    const buildUp = attackingTeam.midfield * cfgP.CALCULATEPASSMULTIPLIER_ATT_MIDFIELD_WEIGHT + dynamicPlaymaking * cfgP.CALCULATEPASSMULTIPLIER_ATT_PLAYMAKING_WEIGHT;
    const pressure = defendingTeam.pressing * cfgP.CALCULATEPASSMULTIPLIER_DEF_PRESSING_WEIGHT + defendingTeam.defense * cfgP.CALCULATEPASSMULTIPLIER_DEF_DEFENSE_WEIGHT;

    const controlRatio = buildUp / Math.max(cfgP.CALCULATEPASSMULTIPLIER_DEF_PRESSURE_MIN, pressure);

    const logMultiplier = cfgP.CALCULATEPASSMULTIPLIER_LOG_BASE + cfgP.CALCULATEPASSMULTIPLIER_K_FACTOR * Math.log(controlRatio);

    return this.clamp(logMultiplier, cfgP.CALCULATEPASSMULTIPLIER_MIN, cfgP.CALCULATEPASSMULTIPLIER_MAX);
  }

  /**
   * Simula la ripartenza in contropiede.
   */
  public simulateCounterAttack(input: CounterAttackInput): CounterAttackResult {
    const cfgC = SIM_CONFIG.COUNTER_ATTACK;

    const rawInput = Number(input.counterAttackRisk);
    const validRisk = this.clamp(isNaN(rawInput) ? cfgC.SIMULATECOUNTERATTACK_FALLBACK_RISK : rawInput, cfgC.SIMULATECOUNTERATTACK_MIN_RISK, cfgC.SIMULATECOUNTERATTACK_MAX_RISK);

    const d_defender = this.clamp(Number(input.defendingPlaystyle?.defensiveLine), 0, 1);

    const risk = this.clamp(validRisk * cfgC.SIMULATECOUNTERATTACK_RISK_SCALE, cfgC.SIMULATECOUNTERATTACK_MIN_RISK, cfgC.SIMULATECOUNTERATTACK_MAX_RISK);

    const passesCompleted = Math.floor(
      this.clamp(cfgC.SIMULATECOUNTERATTACK_PASSES_BASE + risk * cfgC.SIMULATECOUNTERATTACK_PASSES_RISK_WEIGHT, cfgC.PASSES_MIN, cfgC.PASSES_MAX)
    );

    const roll = Math.random();

    const breakthroughProb = cfgC.BREAKTHROUGH_BASE + risk * cfgC.SIMULATECOUNTERATTACK_BREAKTHROUGH_RISK_WEIGHT + d_defender * cfgC.SIMULATECOUNTERATTACK_BREAKTHROUGH_D_DEFENDER_WEIGHT;
    const isShot = roll < breakthroughProb;

    if (isShot) {
      const lineMultiplier = cfgC.SIMULATECOUNTERATTACK_LINE_MULTIPLIER_BASE + d_defender * cfgC.SIMULATECOUNTERATTACK_LINE_MULTIPLIER_D_DEFENDER_WEIGHT;

      const generatedXG = Number(
        (cfgC.DEFAULT_COUNTER_XG * (cfgC.SIMULATECOUNTERATTACK_XG_RISK_BASE + risk * cfgC.SIMULATECOUNTERATTACK_XG_RISK_WEIGHT) * lineMultiplier).toFixed(2)
      );

      return {
        outcome: 'COUNTER_SHOT',
        xG: generatedXG,
        generatedBaseXG: generatedXG,
        breakthroughProbability: Number(this.clamp(breakthroughProb, cfgC.SIMULATECOUNTERATTACK_PROBABILITY_MIN, cfgC.SIMULATECOUNTERATTACK_PROBABILITY_MAX).toFixed(2)),
        passesCompleted
      };
    }

    return {
      outcome: 'COUNTER_FAILED',
      xG: -1,
      breakthroughProbability: Number(this.clamp(breakthroughProb, cfgC.SIMULATECOUNTERATTACK_PROBABILITY_MIN, cfgC.SIMULATECOUNTERATTACK_PROBABILITY_MAX).toFixed(2)),
      passesCompleted
    };
  }

  /**
   * Calcola l'xG finale e l'esito specifico del tiro attingendo le soglie direttamente da SIM_CONFIG.
   */
  public calculateShotXG(input: ShotXGInput): ExtendedShotXGResult {
    const cfgS = SIM_CONFIG.SHOT;
    const attackerBonus = cfgS.CALCULATESHOTXG_ATT_ATTACKER_BASE + (input.attacker - cfgS.CALCULATESHOTXG_ATT_ATTACKER_OFFSET) * cfgS.CALCULATESHOTXG_ATT_ATTACKER_SCALE;
    const defenderPenalty = cfgS.CALCULATESHOTXG_DEF_DEFENDER_BASE - (input.defender - cfgS.CALCULATESHOTXG_DEF_DEFENDER_OFFSET) * cfgS.CALCULATESHOTXG_DEF_DEFENDER_SCALE;

    const finalXG = this.clamp(
      input.baseXG * attackerBonus * defenderPenalty,
      cfgS.CALCULATESHOTXG_FINAL_XG_MIN,
      cfgS.CALCULATESHOTXG_FINAL_XG_MAX
    );

    const roundedXG = Number(finalXG.toFixed(2));
    const roll = Math.random();

    // 1. GOL
    if (roll < finalXG) {
      return {
        finalXG: roundedXG,
        outcome: 'GOAL',
        nextState: 'OPPONENT_POSSESSION',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    }

    // 2. RIPARTIZIONE ESITI NON-GOL VIA CONFIG
    const outcomeRoll = Math.random();
    const cfgSo = SIM_CONFIG.SHOT_OUTCOMES;

    if (outcomeRoll < cfgSo.BLOCKED_THRESHOLD) {
      return {
        finalXG: roundedXG,
        outcome: 'BLOCKED',
        nextState: 'LOOSE_BALL',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    } else if (outcomeRoll < cfgSo.SAVED_CORNER_THRESHOLD) {
      return {
        finalXG: roundedXG,
        outcome: 'SAVED_CORNER',
        nextState: 'CORNER',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    } else if (outcomeRoll < cfgSo.SAVED_REBOUND_THRESHOLD) {
      return {
        finalXG: roundedXG,
        outcome: 'SAVED_REBOUND',
        nextState: 'LOOSE_BALL',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    } else if (outcomeRoll < cfgSo.SAVED_HELD_THRESHOLD) {
      return {
        finalXG: roundedXG,
        outcome: 'SAVED_HELD',
        nextState: 'OPPONENT_POSSESSION',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    } else if (outcomeRoll < cfgSo.POST_BAR_THRESHOLD) {
      return {
        finalXG: roundedXG,
        outcome: 'POST_BAR_REBOUND',
        nextState: 'LOOSE_BALL',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    } else {
      return {
        finalXG: roundedXG,
        outcome: 'OUT',
        nextState: 'OPPONENT_POSSESSION',
        modifiers: { attackerBonus: 0, defenderPenalty: 0, goalkeeperPenalty: 0 }
      };
    }
  }

  public simulateCorner(input: CornerInput): CornerResult {
    const roll = Math.random();
    const advantage = input.attackerAerial - input.defenderAerial;
    const cfgC = SIM_CONFIG.CORNER;

    if (roll < cfgC.SHOT_THRESHOLD + advantage * cfgC.SIMULATECORNER_ADVANTAGE_AERIAL_WEIGHT) {
      return { outcome: 'CORNER_SHOT', nextState: 'SHOT', generatedBaseXG: cfgC.DEFAULT_CORNER_XG };
    } else if (roll < cfgC.LOOSE_BALL_THRESHOLD) {
      return { outcome: 'CORNER_CLEARED_LOOSE', nextState: 'LOOSE_BALL' };
    } else if (roll < cfgC.SIMULATECORNER_COUNTER_THRESHOLD) {
      return { outcome: 'CORNER_COUNTER_ATTACK', nextState: 'COUNTER_ATTACK' };
    }
    return { outcome: 'CORNER_HELD', nextState: 'OPPONENT_POSSESSION' };
  }

  /**
   * Simula il duello su palla contesa / seconda palla.
   */
  public simulateLooseBall(input: LooseBallInput): LooseBallResult {
    const roll = Math.random();
    const advantage = input.attackerReactivity - input.defenderReactivity;
    const cfgL = SIM_CONFIG.LOOSE_BALL;

    if (roll < cfgL.SIMULATEDLOOSEBALL_SHOT_BASE_THRESHOLD + advantage * cfgL.SIMULATEDLOOSEBALL_SHOT_ADVANTAGE_WEIGHT) {
      return { outcome: 'REBOUND_SHOT', nextState: 'SHOT', generatedBaseXG: cfgL.DEFAULT_REBOUND_XG };
    } else if (roll < cfgL.SIMULATEDLOOSEBALL_POSSESSION_BASE_THRESHOLD + advantage * cfgL.SIMULATEDLOOSEBALL_POSSESSION_ADVANTAGE_WEIGHT) {
      return { outcome: 'ATTACK_RETAINED', nextState: 'POSSESSION_RETAINED' };
    } else if (roll < cfgL.SIMULATEDLOOSEBALL_CLEARANCE_THRESHOLD) {
      return { outcome: 'DEFENSE_CLEARED_LONG', nextState: 'COUNTER_ATTACK' };
    }
    return { outcome: 'DEFENSE_RECOVERED', nextState: 'OPPONENT_POSSESSION' };
  }

  // --- HELPER PRIVATI DI CALCOLO ---

  private calculateCompletionProbability(att: TeamStats, def: TeamStats, v: number, d: number, currentPassSequence: number = 0): number {
    const cfgP = SIM_CONFIG.POSSESSION;
    const dynamicPlaymaking = att.getPlaymaking(currentPassSequence);
    const buildUpQuality = dynamicPlaymaking * cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_PLAYMAKING_WEIGHT + att.midfield * cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_MIDFIELD_WEIGHT;
    const defensivePressure = def.pressing * cfgP.CALCULATECOMPLETIONPROBABILITY_DEF_PRESSING_WEIGHT + def.defense * cfgP.CALCULATECOMPLETIONPROBABILITY_DEF_DEFENSE_WEIGHT;

    const baseProb = cfgP.CALCULATECOMPLETIONPROBABILITY_BASE_PROB + (buildUpQuality - defensivePressure) / cfgP.CALCULATECOMPLETIONPROBABILITY_STAT_DIFF_DIVISOR;

    const verticalityPenalty = cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_V_BASE_PENALTY + (v - cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_V_OFFSET) * cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_V_SCALE;

    return this.clamp(baseProb - verticalityPenalty + d * cfgP.CALCULATECOMPLETIONPROBABILITY_ATT_D_SCALE, cfgP.CALCULATECOMPLETIONPROBABILITY_MIN, cfgP.CALCULATECOMPLETIONPROBABILITY_MAX);
  }

  private calculateGeneratedXG(att: any, def: any, v: number, d: number): number {
    const cfgP = SIM_CONFIG.POSSESSION;
    const attQual = att.attack * cfgP.CALCULATEGENERATEDXG_ATT_ATTACK_WEIGHT + att.playmaking * cfgP.CALCULATEGENERATEDXG_ATT_PLAYMAKING_WEIGHT;
    const defQual = def.defense * cfgP.CALCULATEGENERATEDXG_DEF_DEFENSE_WEIGHT + def.pressing * cfgP.CALCULATEGENERATEDXG_DEF_PRESSING_WEIGHT;
    const baseXG = cfgP.DEFAULT_OPEN_PLAY_XG;

    const defensiveLineFactor = cfgP.CALCULATEGENERATEDXG_ATT_D_OFFSET + d * cfgP.CALCULATEGENERATEDXG_ATT_D_SCALE;

    const rawXG = baseXG * (attQual / Math.max(cfgP.CALCULATEGENERATEDXG_DEF_QUAL_MIN, defQual)) * defensiveLineFactor;

    return this.clamp(rawXG, cfgP.CALCULATEGENERATEDXG_MIN, cfgP.CALCULATEGENERATEDXG_MAX);
  }
}