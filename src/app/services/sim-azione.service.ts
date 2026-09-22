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
  LooseBallResult
} from '../sim.model';
import { SIM_CONFIG } from '../config/sim-config.const';

@Injectable({
  providedIn: 'root'
})
export class SimAzioneService {

  /**
     * Esegue N iterazioni di una simulazione passando l'input specificato.
     * 
     * @param simFn Funzione di simulazione che riceve un parametro di tipo P e restituisce T
     * @param iterations Numero di iterazioni da eseguire
     * @param input Dati di input da passare ad ogni esecuzione della funzione
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
    const playstyle = input.attackingPlaystyle ?? input.playstyle ?? { verticality: 0.5, defensiveLine: 0.5 };

    const v = this.clamp(playstyle.verticality, 0, 1);
    const d = this.clamp(playstyle.defensiveLine, 0, 1);

    // Stima dei passaggi completati nella manovra usando i parametri di configurazione
    const cfgP = SIM_CONFIG.POSSESSION;
    const passesCompleted = Math.floor(
      this.clamp(cfgP.BASE_PASSES_MAX - v * cfgP.PASSES_VERTICALITY_WEIGHT, cfgP.BASE_PASSES_MIN, cfgP.BASE_PASSES_MAX)
    );

    const completionProbability = this.calculateCompletionProbability(attackingTeam, defendingTeam, v, d);
    const roll = Math.random();

    // ESITO 1: PALLA PERSA / RISCHIO CONTROPIEDE
    if (roll > completionProbability) {
      const isHighRecovery = d > cfgP.HIGH_RECOVERY_DEFENSIVE_LINE_THRESHOLD;
      const counterRisk = this.clamp((v * cfgP.COUNTER_RISK_V_WEIGHT + d * cfgP.COUNTER_RISK_D_WEIGHT) * cfgP.COUNTER_RISK_MULTIPLIER, 0, 1);

      return {
        outcome: 'COUNTER_ATTACK_RISK',
        xG: -1,
        counterAttackRisk: Number(counterRisk.toFixed(2)),
        highRecovery: isHighRecovery,
        completionProbability: Number(completionProbability.toFixed(2)),
        passesCompleted
      };
    }

    // ESITO 2: SFONDAMENTO / OCCASIONE CREATA
    const chanceToBreakThrough = this.clamp(
      cfgP.BREAKTHROUGH_BASE + v * cfgP.BREAKTHROUGH_V_WEIGHT + (v * d * cfgP.BREAKTHROUGH_VD_WEIGHT),
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
        passesCompleted
      };
    }

    // ESITO 3: MANTENIMENTO POSSESSO
    return {
      outcome: 'POSSESSION_RETAINED',
      xG: -1,
      counterAttackRisk: -1,
      highRecovery: false,
      completionProbability: Number(completionProbability.toFixed(2)),
      passesCompleted
    };
  }

  /**
   * Simula la ripartenza in contropiede.
   */
  public simulateCounterAttack(input: CounterAttackInput): CounterAttackResult {
    const cfgC = SIM_CONFIG.COUNTER_ATTACK;
    const risk = this.clamp(input.counterAttackRisk ?? 0.5, 0.1, 1.0);
    const passesCompleted = Math.floor(this.clamp(2 + risk * 2, cfgC.PASSES_MIN, cfgC.PASSES_MAX));

    const roll = Math.random();
    const isShot = roll < (cfgC.BREAKTHROUGH_BASE + risk * 0.4);

    if (isShot) {
      const generatedXG = Number((cfgC.DEFAULT_COUNTER_XG * (0.8 + risk * 0.5)).toFixed(2));
      return {
        outcome: 'COUNTER_SHOT',
        xG: generatedXG,
        generatedBaseXG: generatedXG,
        breakthroughProbability: Number(risk.toFixed(2)),
        passesCompleted
      };
    }

    return {
      outcome: 'COUNTER_FAILED',
      xG: -1,
      breakthroughProbability: Number(risk.toFixed(2)),
      passesCompleted
    };
  }

  /**
   * Calcola l'xG finale e l'esito specifico del tiro attingendo le soglie direttamente da SIM_CONFIG.
   */
  public calculateShotXG(input: ShotXGInput): ExtendedShotXGResult {
    const finalXG = this.clamp(
      input.baseXG * (0.6 + input.attacker * 0.8) * (1.2 - input.defender * 0.4),
      0.01,
      0.95
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

    if (roll < cfgC.SHOT_THRESHOLD + advantage * 0.20) {
      return { outcome: 'CORNER_SHOT', nextState: 'SHOT', generatedBaseXG: cfgC.DEFAULT_CORNER_XG };
    } else if (roll < cfgC.LOOSE_BALL_THRESHOLD) {
      return { outcome: 'CORNER_CLEARED_LOOSE', nextState: 'LOOSE_BALL' };
    } else if (roll < 0.85) {
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

    if (roll < 0.20 + advantage * 0.15) {
      return { outcome: 'REBOUND_SHOT', nextState: 'SHOT', generatedBaseXG: SIM_CONFIG.LOOSE_BALL.DEFAULT_REBOUND_XG };
    } else if (roll < 0.50 + advantage * 0.20) {
      return { outcome: 'ATTACK_RETAINED', nextState: 'POSSESSION_RETAINED' };
    } else if (roll < 0.75) {
      return { outcome: 'DEFENSE_CLEARED_LONG', nextState: 'COUNTER_ATTACK' };
    }
    return { outcome: 'DEFENSE_RECOVERED', nextState: 'OPPONENT_POSSESSION' };
  }

  // --- HELPER PRIVATI DI CALCOLO ---

  private calculateCompletionProbability(att: any, def: any, v: number, d: number): number {
    const attPower = att.midfield * 0.4 + att.playmaking * 0.6;
    const defPower = def.defense * 0.5 + def.pressing * 0.5;
    const baseProb = 0.70 + (attPower - defPower) / 200;
    return this.clamp(baseProb - v * 0.15 + d * 0.05, 0.40, 0.95);
  }

  private calculateGeneratedXG(att: any, def: any, v: number, d: number): number {
    const attQual = att.attack * 0.6 + att.playmaking * 0.4;
    const defQual = def.defense * 0.7 + def.pressing * 0.3;
    const baseXG = SIM_CONFIG.POSSESSION.DEFAULT_OPEN_PLAY_XG;
    return this.clamp(baseXG * (attQual / Math.max(1, defQual)), 0.03, 0.50);
  }
}