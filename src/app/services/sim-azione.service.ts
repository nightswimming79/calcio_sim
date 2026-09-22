import { Injectable } from '@angular/core';
import {
  SimulationInput,
  ActionSimulationResult,
  TeamStats,
  PlaystyleConfig,
  ShotXGInput,
  ShotXGResult,
  CounterAttackInput,
  CounterAttackResult,
  SingleActionInput,
  SingleActionResult,
  ShotOutcome,
  ExtendedShotXGResult,
  CornerInput,
  CornerResult,
  LooseBallInput,
  LooseBallResult
} from '../sim.model';

@Injectable({
  providedIn: 'root'
})
export class SimAzioneService {

  private readonly MAX_XG_OPEN_PLAY = 0.80;

  /**
     * Esegue N volte una funzione passando lo stesso input e raccoglie gli output in un array.
     * 
     * @param fn La funzione da eseguire (accetta input: TInput e restituisce TOutput)
     * @param volte Numero di iterazioni da eseguire
     * @param inputGenerico Il parametro da passare a ogni chiamata
     * @returns Array contenente tutti i risultati generati
     */
  iterate<TInput, TOutput>(
    fn: (input: TInput) => TOutput,
    volte: number,
    inputGenerico: TInput
  ): TOutput[] {
    const risultati: TOutput[] = [];

    for (let i = 0; i < volte; i++) {
      risultati.push(fn(inputGenerico));
    }

    return risultati;
  }

  public simulatePossession(input: SimulationInput): ActionSimulationResult {
    // 1. Estrazione sicura delle squadre dall'input
    const attackingTeam = input.attackingTeam;
    const defendingTeam = input.defendingTeam;

    // 2. Estrazione sicura del playstyle con fallback a 0.5
    const playstyle = input.attackingPlaystyle ?? input.playstyle ?? { verticality: 0.5, defensiveLine: 0.5 };

    const v = this.clamp(playstyle.verticality, 0, 1);
    const d = this.clamp(playstyle.defensiveLine, 0, 1);

    // 3. Stima dei passaggi completati nella manovra (in base alla verticalità)
    // Più il gioco è manovrato (v basso), più passaggi si completano prima dell'esito
    const passesCompleted = Math.floor(this.clamp(6 - v * 4, 1, 8));

    // 4. Probabilità che la giocata NON sia un errore banale / intercetto rapido
    const completionProbability = this.calculateCompletionProbability(attackingTeam, defendingTeam, v, d);

    const roll = Math.random();

    // ESITO 1: PALLA PERSA / RISCHIO CONTROPIEDE (Roll fallito)
    if (roll > completionProbability) {
      const isHighRecovery = d > 0.6;
      const counterRisk = this.clamp((v * 0.11 + d * 0.07) * 2, 0, 1);

      return {
        outcome: 'COUNTER_ATTACK_RISK',
        xG: -1,
        counterAttackRisk: Number(counterRisk.toFixed(2)),
        highRecovery: isHighRecovery,
        completionProbability: Number(completionProbability.toFixed(2)),
        passesCompleted
      };
    }

    // 5. Se il passaggio è riuscito, valuto lo sfondamento (Chance da tiro vs Mantenimento possesso)
    const chanceToBreakThrough = this.clamp(0.15 + v * 0.35 + (v * d * 0.2), 0.10, 0.85);
    const secondRoll = Math.random();

    // ESITO 2: OCCASIONE CREATA (Sfondamento riuscito -> Si va al tiro)
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

    // ESITO 3: MANTENIMENTO DEL POSSESSO (Giro palla continuo)
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
   * Calcola la probabilità di successo considerando l'impatto del Pressing (d)
   */
  private calculateCompletionProbability(
    att: TeamStats,
    def: TeamStats,
    v: number,
    d: number
  ): number {
    const buildUpAbility = att.midfield * 0.6 + att.playmaking * 0.4;

    // Il pressing fa male al gioco corto (v basso). Se l'attacco lancia lungo (v alto), salta il pressing.
    const pressingEffectiveness = d * (1 - v * 0.7);
    const totalDefensePressure = def.pressing * pressingEffectiveness + def.defense * (1 - d) * 0.5;

    const ratio = buildUpAbility / (buildUpAbility + Math.max(1, totalDefensePressure));

    return this.clamp(ratio, 0.05, 0.98);
  }

  /**
   * Calcola l'xG generato dall'interazione tra Verticalità (v) e Linea Difensiva (d)
   */
  private calculateGeneratedXG(
    att: TeamStats,
    def: TeamStats,
    v: number,
    d: number
  ): number {
    const areaDensityBonus = (1 - d) * 0.7;
    const effectiveDefense = def.defense * (1 + areaDensityBonus);

    const exploitHighLineBonus = v * d * 0.8;
    const controlBonus = (1 - v) * (1 - d) * 0.2;

    // ORA INCLUDIAMO ANCHE LA QUALITÀ DELL'ATTACCO (ATT):
    // 40% Regia, 40% Attacco/Movimento punte, 20% Centrocampo
    const attackQuality = att.playmaking * 0.4 + att.attack * 0.4 + att.midfield * 0.2;

    const effectiveAttack = attackQuality * (1 + exploitHighLineBonus + controlBonus);

    const attackRatio = effectiveAttack / (effectiveAttack + effectiveDefense);

    let averageXg = this.MAX_XG_OPEN_PLAY * Math.pow(attackRatio, 2);
    let varianceXg = Math.min(0.95 - averageXg, averageXg - 0.05);

    return averageXg - varianceXg + Math.random() * varianceXg * 2;
  }


  private clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
  }





  /**
 * Calcola l'xG finale e determina lo specifico esito fisico e di possesso del tiro.
 */
  public calculateShotXG(input: ShotXGInput): ExtendedShotXGResult {
    // 1. CALCOLO LOGISTICO xG (Invariato)
    const baseXG = this.clamp(input.baseXG, 0.01, 0.99);
    const baseLogit = Math.log(baseXG / (1 - baseXG));

    const A = this.clamp(input.attacker, 0, 1);
    const D = this.clamp(input.defender, 0, 1);
    const P = this.clamp(input.goalkeeper, 0, 1);

    const wA = 0.8;
    const wD = 2.0;
    const wP = 1.5;

    const attackerBonus = wA * (A - 0.5);
    const defenderPenalty = -wD * (D - 0.5);
    const goalkeeperPenalty = -wP * (P - 0.5);

    const z = baseLogit + attackerBonus + defenderPenalty + goalkeeperPenalty;
    const finalXG = 1 / (1 + Math.exp(-z));
    const roundedXG = Number(finalXG.toFixed(3));

    // 2. CHECK GOL (Roll 1)
    if (Math.random() < roundedXG) {
      return {
        finalXG: roundedXG,
        outcome: 'GOAL',
        nextState: 'OPPONENT_POSSESSION',
        modifiers: {
          attackerBonus: Number(attackerBonus.toFixed(3)),
          defenderPenalty: Number(defenderPenalty.toFixed(3)),
          goalkeeperPenalty: Number(goalkeeperPenalty.toFixed(3))
        }
      };
    }

    // 3. SE NON È GOL: DETERMINAZIONE SPECIFICA DELL'ESITO (Roll 2)
    const nonGoalRoll = Math.random();

    // A. TIRO MURATO DALLA DIFESA
    // Probabilità di muro dinamica basata sull'attributo Difesa (12% - 32%)
    const blockProbability = 0.12 + D * 0.20;

    if (nonGoalRoll < blockProbability) {
      return {
        finalXG: roundedXG,
        outcome: 'BLOCKED',
        nextState: 'LOOSE_BALL', // Palla contesa sulla trequarti
        modifiers: {
          attackerBonus: Number(attackerBonus.toFixed(3)),
          defenderPenalty: Number(defenderPenalty.toFixed(3)),
          goalkeeperPenalty: Number(goalkeeperPenalty.toFixed(3))
        }
      };
    }

    // B. TIRO NELLO SPECCHIO (PARATO) VS FUORI / PALO
    // La percentuale di tiri nello specchio cresce con l'abilità dell'attaccante e cala con l'xG basso
    const onTargetProbability = 0.45 + A * 0.20 + roundedXG * 0.25;
    const isOnTarget = Math.random() < onTargetProbability;

    let outcome: ShotOutcome;
    let nextState: 'OPPONENT_POSSESSION' | 'CORNER' | 'LOOSE_BALL';

    if (isOnTarget) {
      // Risoluzione della PARATA DEL PORTIERE (Roll 3)
      const saveRoll = Math.random();

      // Più il portiere è forte (P alto), più tende a bloccare la palla anziché respingerla male
      const holdChance = 0.35 + P * 0.25;        // 35% - 60%
      const cornerChance = 0.30;                 // 30% deviazione in angolo
      // La quota rimanente (~10%-35%) è una respinta corta (palla contesa)

      if (saveRoll < holdChance) {
        outcome = 'SAVED_HELD';
        nextState = 'OPPONENT_POSSESSION';
      } else if (saveRoll < holdChance + cornerChance) {
        outcome = 'SAVED_CORNER';
        nextState = 'CORNER';
      } else {
        outcome = 'SAVED_REBOUND';
        nextState = 'LOOSE_BALL';
      }
    } else {
      // TIRO FUORI SPECCHIO O PALO/TRAVERSA (Roll 3)
      const woodChance = 0.08; // ~8% dei tiri fuori colpisce un legno e torna in campo

      if (Math.random() < woodChance) {
        outcome = 'POST_BAR_REBOUND';
        nextState = 'LOOSE_BALL';
      } else {
        outcome = 'OUT';
        nextState = 'OPPONENT_POSSESSION';
      }
    }

    return {
      finalXG: roundedXG,
      outcome,
      nextState,
      modifiers: {
        attackerBonus: Number(attackerBonus.toFixed(3)),
        defenderPenalty: Number(defenderPenalty.toFixed(3)),
        goalkeeperPenalty: Number(goalkeeperPenalty.toFixed(3))
      }
    };
  }

  /**
  * Simula una ripartenza rapida / contropiede partendo dal rischio accumulato
  * dalla squadra che ha appena perso il pallone.
  */
  public simulateCounterAttack(input: CounterAttackInput): CounterAttackResult {
    const { attackingTeam, defendingTeam, counterAttackRisk, highRecovery } = input;
    const risk = this.clamp(input.counterAttackRisk ?? 0.5, 0.1, 1.0);

    // 1. Probabilità di arrivare al tiro (Con risk = 0.20, breakthroughProbability sarà ~0.12, ossia 12%)
    const baseBreakthrough = 0.08;
    const riskBonus = risk * 0.20; // 0.20 * 0.20 = 0.04
    const highRecoveryBonus = highRecovery ? 0.06 : 0.0;

    const breakthroughProbability = this.clamp(
      baseBreakthrough + riskBonus + highRecoveryBonus,
      0.05,
      0.40
    );

    // Check probabilistico (Superamento transizione)
    const isSuccess = Math.random() < breakthroughProbability;

    if (!isSuccess) {
      return {
        outcome: 'COUNTER_FAILED',
        xG: 0,
        breakthroughProbability: Number(breakthroughProbability.toFixed(2))
      };
    }

    // 2. Calcolo xG per i soli contropiedi che arrivano al tiro (Target: ~0.44 xG con att/def pari)
    const attQuality = attackingTeam.attack * 0.6 + attackingTeam.playmaking * 0.4;
    const defRecoveryQuality = defendingTeam.defense * 0.7 + defendingTeam.midfield * 0.3;

    const ratio = attQuality / (attQuality + Math.max(1, defRecoveryQuality)); // 0.5 per squadre pari

    // Base xG tarata a 0.42 per un rapporto di 0.5
    const baseXG = 0.42 * Math.pow(ratio * 2, 1.2);

    // Modulazione del rischio (+15% con risk = 0.20 -> 0.42 * 1.03 = ~0.435 xG)
    const finalXG = baseXG * (1 + risk * 0.15);



    let averageXg = this.clamp(finalXG, 0.10, 0.75);
    let varianceXg = Math.min(0.95 - averageXg, averageXg - 0.05);



    return {
      outcome: 'COUNTER_CHANCE_CREATED',
      xG: Number((averageXg - varianceXg + Math.random() * varianceXg * 2).toFixed(2)),
      breakthroughProbability: Number(breakthroughProbability.toFixed(2))
    };
  }


  /**
 * Simula un ciclo completo di azione: prima il possesso palla della squadra attaccante,
 * e in caso di palla persa, l'eventuale contropiede immediato della squadra avversaria.
 */
  public simulateFullAction(input: SingleActionInput): SingleActionResult {
    const isTeamAAttacking = input.startingPossession === 'A';

    // Configurazione dinamica dei ruoli per questa singola azione
    const attackingTeam = isTeamAAttacking ? input.teamA : input.teamB;
    const attackingPlaystyle = isTeamAAttacking ? input.playstyleA : input.playstyleB;

    const defendingTeam = isTeamAAttacking ? input.teamB : input.teamA;
    const defendingPlaystyle = isTeamAAttacking ? input.playstyleB : input.playstyleA;

    // 1. SIMULAZIONE POSSESSO INIZIALE
    const possessionResult = this.simulatePossession({
      attackingTeam,
      defendingTeam,
      playstyle: attackingPlaystyle
    });

    // ESITO A: OCCASIONE DA AZIONE MANOVRATA (Tiro della squadra attaccante)
    if (possessionResult.outcome === 'CHANCE_CREATED') {
      return {
        currentPossession: isTeamAAttacking ? 'A' : 'B',
        xgTeamA: isTeamAAttacking ? possessionResult.xG : -1,
        xgTeamB: isTeamAAttacking ? -1 : possessionResult.xG,
        outcome: 'CHANCE_CREATED'
      };
    }

    // ESITO B: POSSESSO MANTENUTO (La palla gira, la squadra mantiene il pallone)
    if (possessionResult.outcome === 'POSSESSION_RETAINED') {
      return {
        currentPossession: isTeamAAttacking ? 'A' : 'B',
        xgTeamA: -1,
        xgTeamB: -1,
        outcome: 'POSSESSION_RETAINED'
      };
    }

    // ESITO C: PALLA PERSA (POSSESSION_LOST) -> La squadra difendente recupera palla e tenta il contropiede
    const counterInput: CounterAttackInput = {
      attackingTeam: defendingTeam,      // Chi riparte in contropiede ora è chi difendeva
      defendingTeam: attackingTeam,      // Chi ha perso palla deve recuperare la posizione
      counterAttackRisk: possessionResult.counterAttackRisk, // Rischio generato dallo sbilanciamento precedente
      highRecovery: possessionResult.highRecovery
    };

    const counterResult = this.simulateCounterAttack(counterInput);

    // Il possesso ora passa tassativamente alla squadra che ha recuperato palla (chi difendeva)
    const newPossession: 'A' | 'B' = isTeamAAttacking ? 'B' : 'A';

    if (counterResult.outcome === 'COUNTER_CHANCE_CREATED') {
      return {
        currentPossession: newPossession,
        // Se A stava attaccando ed è ripartita B, l'xG va a B (e viceversa)
        xgTeamA: isTeamAAttacking ? -1 : counterResult.xG,
        xgTeamB: isTeamAAttacking ? counterResult.xG : -1,
        outcome: 'COUNTER_CHANCE_CREATED'
      };
    }

    // Contropiede fallito/sfumato: la squadra B (o A) ha recuperato palla ma non è andata al tiro
    return {
      currentPossession: newPossession,
      xgTeamA: -1,
      xgTeamB: -1,
      outcome: 'COUNTER_FAILED'
    };
  }



  /**
   * Simula la risoluzione di un calcio d'angolo.
   */
  public simulateCorner(input: CornerInput): CornerResult {
    const A = this.clamp(input.attackerAerial, 0, 1);
    const D = this.clamp(input.defenderAerial, 0, 1);
    const P = this.clamp(input.goalkeeperExit, 0, 1);

    // 1. Probabilità che l'attacco impatti la palla per un tiro/testa (15% - 40%)
    const shotChance = 0.15 + (A * 0.25) - (D * 0.10) - (P * 0.05);
    const clampedShotChance = Math.max(0.08, shotChance);

    const roll = Math.random();

    // ESITO 1: IMPATTO AEREI / TIRO DA CORNER
    if (roll < clampedShotChance) {
      // L'xG base di un colpo di testa su corner varia tipicamente tra 0.06 e 0.22
      const generatedBaseXG = Number((0.06 + A * 0.16).toFixed(2));

      return {
        outcome: 'CORNER_SHOT',
        nextState: 'SHOT',
        generatedBaseXG
      };
    }

    // ESITO 2, 3, 4: RESPINTE E CONTRO-DIFESA
    const defenseRoll = Math.random();

    // Uscita / Blocco del portiere o controllo difesa
    const holdChance = 0.30 + P * 0.25;
    // Respinta lunga che innesca contropiede (più probabile se la difesa è forte e il portiere esce bene)
    const counterChance = 0.15 + D * 0.15;

    if (defenseRoll < holdChance) {
      return {
        outcome: 'CORNER_HELD',
        nextState: 'OPPONENT_POSSESSION'
      };
    } else if (defenseRoll < holdChance + counterChance) {
      return {
        outcome: 'CORNER_COUNTER_ATTACK',
        nextState: 'COUNTER_ATTACK'
      };
    } else {
      return {
        outcome: 'CORNER_CLEARED_LOOSE',
        nextState: 'LOOSE_BALL'
      };
    }
  }


  /**
 * Simula la risoluzione di una palla contesa / seconda palla sulla trequarti o in area.
 */
  public simulateLooseBall(input: LooseBallInput): LooseBallResult {
    const A = this.clamp(input.attackerReactivity, 0, 1);
    const D = this.clamp(input.defenderReactivity, 0, 1);
    const Line = this.clamp(input.defensiveLine, 0, 1);

    // 1. Calcolo del valore del duello sulla seconda palla (-0.5 a +0.5)
    const duelDiff = A - D;

    // 2. Probabilità che l'attacco riconquisti la palla (Base 40%)
    const attackWinChance = this.clamp(0.40 + (duelDiff * 0.35), 0.10, 0.85);

    const roll = Math.random();

    // --- CASO 1: VINCE L'ATTACCO ---
    if (roll < attackWinChance) {
      const subRoll = Math.random();
      // Più l'attacco è reattivo, più è probabile trasformare la palla contesa in un tiro immediato (Tap-in)
      const shotChance = 0.40 + (A * 0.30);

      if (subRoll < shotChance) {
        // xG elevato poiché nasce da una situazione disordinata in area (0.15 - 0.45)
        const generatedBaseXG = Number((0.15 + A * 0.30).toFixed(2));
        return {
          outcome: 'REBOUND_SHOT',
          nextState: 'SHOT',
          generatedBaseXG
        };
      } else {
        return {
          outcome: 'ATTACK_RETAINED',
          nextState: 'POSSESSION_RETAINED'
        };
      }
    }
    // --- CASO 2: VINCE LA DIFESA ---
    else {
      const subRoll = Math.random();
      // Se la linea difensiva è alta o la difesa è molto aggressiva, aumenta il rischio di contropiede lanciato
      const counterChance = 0.20 + (Line * 0.20) + (D * 0.15);

      if (subRoll < counterChance) {
        return {
          outcome: 'DEFENSE_CLEARED_LONG',
          nextState: 'COUNTER_ATTACK'
        };
      } else {
        return {
          outcome: 'DEFENSE_RECOVERED',
          nextState: 'OPPONENT_POSSESSION'
        };
      }
    }
  }

}