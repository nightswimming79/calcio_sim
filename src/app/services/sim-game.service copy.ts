import { Injectable } from '@angular/core';
import { SimAzioneService } from './sim-azione.service';
import {
  GameSequenceInput,
  GameSequenceResult,
  TeamSequenceStats
} from '../sim-game.model';

@Injectable({
  providedIn: 'root'
})
export class SimGameServiceOld {

  constructor(private simAzioneService: SimAzioneService) { }

  /**
   * Simula una sequenza partita divisa in DUE TEMPI da N azioni ciascuno:
   * - Primo Tempo (N azioni): Inizia la Squadra A
   * - Secondo Tempo (N azioni): Inizia la Squadra B
   * 
   * In totale vengono simulate N * 2 azioni per sequenza.
   */
  public simulateSequence(input: GameSequenceInput, N: number): GameSequenceResult {
    let counterAttacksCount = 0;
    let cornersCount = 0;
    let looseBallsCount = 0;

    const statsA: TeamSequenceStats = this.createEmptyTeamStats();
    const statsB: TeamSequenceStats = this.createEmptyTeamStats();

    // Callbacks per tracciare gli eventi globali durante i due tempi
    const onCorner = () => cornersCount++;
    const onLooseBall = () => looseBallsCount++;
    const onCounter = () => counterAttacksCount++;

    // 1. PRIMO TEMPO (N Azioni) - Calcio d'inizio alla Squadra A
    this.runHalfTime(
      N,
      'A',
      input,
      statsA,
      statsB,
      onCorner,
      onLooseBall,
      onCounter
    );

    // 2. SECONDO TEMPO (N Azioni) - Calcio d'inizio alla Squadra B
    this.runHalfTime(
      N,
      'B',
      input,
      statsA,
      statsB,
      onCorner,
      onLooseBall,
      onCounter
    );

    // 3. RIFINITURA FINALE E CALCOLO METRICHE AGGREGATE
    this.finalizeTeamStats(statsA, statsB);

    return {
      totalActions: N * 2, // 20 + 20 = 40 azioni totali
      sequenceDetails: {
        counterAttacksCount,
        cornersCount,
        looseBallsCount
      },
      statsA,
      statsB
    };
  }

  // =========================================================================
  // HELPER PRIVATI
  // =========================================================================

  /**
   * Simula un singolo tempo di gioco da N azioni partendo da una squadra specifica.
   */
  private runHalfTime(
    N: number,
    startingTeam: 'A' | 'B',
    input: GameSequenceInput,
    statsA: TeamSequenceStats,
    statsB: TeamSequenceStats,
    onCorner: () => void,
    onLooseBall: () => void,
    onCounter: () => void
  ): void {
    let currentPossession: 'A' | 'B' = startingTeam;

    for (let i = 0; i < N; i++) {
      const attackingTeam = currentPossession;
      const defendingTeam = currentPossession === 'A' ? 'B' : 'A';

      const attTeamData = attackingTeam === 'A' ? input.teamA : input.teamB;
      const defTeamData = defendingTeam === 'A' ? input.teamA : input.teamB;
      const attPlaystyle = attackingTeam === 'A' ? input.playstyleA : input.playstyleB;
      const defPlaystyle = defendingTeam === 'A' ? input.playstyleA : input.playstyleB;

      const currentStatsAtt = attackingTeam === 'A' ? statsA : statsB;
      const currentStatsDef = defendingTeam === 'A' ? statsA : statsB;

      // FASE DI POSSESSO ORDINARIA / MANOVRA
      const possessionResult = this.simAzioneService.simulatePossession({
        attackingTeam: attTeamData,
        defendingTeam: defTeamData,
        attackingPlaystyle: attPlaystyle,
        defendingPlaystyle: defPlaystyle
      });

      const passes = possessionResult.passesCompleted ?? 0;
      currentStatsAtt.passesByState.openPlay += passes;
      currentStatsAtt.passesByState.total += passes;

      switch (possessionResult.outcome) {
        case 'CHANCE_CREATED': {
          const shotResult = this.simAzioneService.calculateShotXG({
            baseXG: possessionResult.generatedBaseXG ?? 0.20,
            attacker: attTeamData.attack / 100,
            defender: (defTeamData.defense * 0.7 + defTeamData.pressing * 0.3) / 100,
            goalkeeper: defTeamData.goalkeeper / 100
          });

          this.recordShot(currentStatsAtt, shotResult, 'openPlay');

          currentPossession = this.resolveNextStateAfterShot(
            shotResult.nextState,
            attackingTeam,
            defendingTeam,
            input,
            statsA,
            statsB,
            onCorner,
            onLooseBall,
            onCounter
          );
          break;
        }

        case 'COUNTER_ATTACK_RISK': {
          onCounter();

          const counterResult = this.simAzioneService.simulateCounterAttack({
            attackingTeam: defTeamData,
            defendingTeam: attTeamData,
            attackingPlaystyle: defPlaystyle,
            defendingPlaystyle: attPlaystyle
          });

          const counterPasses = counterResult.passesCompleted ?? 0;
          currentStatsDef.passesByState.counterAttack += counterPasses;
          currentStatsDef.passesByState.total += counterPasses;

          if (counterResult.outcome === 'COUNTER_SHOT') {
            const shotResult = this.simAzioneService.calculateShotXG({
              baseXG: counterResult.generatedBaseXG ?? 0.30,
              attacker: defTeamData.attack / 100,
              defender: (attTeamData.defense * 0.7 + attTeamData.pressing * 0.3) / 100,
              goalkeeper: attTeamData.goalkeeper / 100
            });

            this.recordShot(currentStatsDef, shotResult, 'counterAttack');

            currentPossession = this.resolveNextStateAfterShot(
              shotResult.nextState,
              defendingTeam,
              attackingTeam,
              input,
              statsA,
              statsB,
              onCorner,
              onLooseBall,
              onCounter
            );
          } else {
            currentPossession = defendingTeam;
          }
          break;
        }

        case 'POSSESSION_RETAINED':
        default:
          currentPossession = possessionResult.currentPossession ?? defendingTeam;
          break;
      }
    }
  }

  private recordShot(
    stats: TeamSequenceStats,
    shotResult: any,
    state: 'openPlay' | 'counterAttack' | 'corner' | 'looseBall'
  ): void {
    stats.shots.total++;
    stats.xgByState[state] += shotResult.finalXG;
    stats.totalXG += shotResult.finalXG;

    if (shotResult.outcome === 'GOAL') {
      stats.goals++;
      stats.shots.onTarget++;
    } else if (
      shotResult.outcome === 'SAVED_HELD' ||
      shotResult.outcome === 'SAVED_CORNER' ||
      shotResult.outcome === 'SAVED_REBOUND'
    ) {
      stats.shots.onTarget++;
    } else if (shotResult.outcome === 'BLOCKED') {
      stats.shots.blocked++;
    } else if (shotResult.outcome === 'POST_BAR_REBOUND') {
      stats.shots.woodwork++;
    }
  }

  private resolveNextStateAfterShot(
    nextState: 'OPPONENT_POSSESSION' | 'CORNER' | 'LOOSE_BALL',
    attackingTeam: 'A' | 'B',
    defendingTeam: 'A' | 'B',
    input: GameSequenceInput,
    statsA: TeamSequenceStats,
    statsB: TeamSequenceStats,
    onCorner: () => void,
    onLooseBall: () => void,
    onCounter: () => void
  ): 'A' | 'B' {

    const currentStatsAtt = attackingTeam === 'A' ? statsA : statsB;

    const attTeamData = attackingTeam === 'A' ? input.teamA : input.teamB;
    const defTeamData = defendingTeam === 'A' ? input.teamA : input.teamB;

    if (nextState === 'CORNER') {
      onCorner();
      currentStatsAtt.cornersWon++;

      const cornerResult = this.simAzioneService.simulateCorner({
        attackerAerial: (attTeamData.attack * 0.4 + attTeamData.cornerAttack * 0.6) / 100,
        defenderAerial: (defTeamData.defense * 0.4 + defTeamData.cornerDefense * 0.6) / 100,
        goalkeeperExit: defTeamData.goalkeeper / 100
      });

      currentStatsAtt.passesByState.corner += 1;
      currentStatsAtt.passesByState.total += 1;

      if (cornerResult.outcome === 'CORNER_SHOT') {
        const cornerShotResult = this.simAzioneService.calculateShotXG({
          baseXG: cornerResult.generatedBaseXG ?? 0.12,
          attacker: attTeamData.attack / 100,
          defender: defTeamData.cornerDefense / 100,
          goalkeeper: defTeamData.goalkeeper / 100
        });

        this.recordShot(currentStatsAtt, cornerShotResult, 'corner');
        return defendingTeam;
      } else if (cornerResult.outcome === 'CORNER_COUNTER_ATTACK') {
        onCounter();
        return defendingTeam;
      } else if (cornerResult.outcome === 'CORNER_CLEARED_LOOSE') {
        return this.resolveLooseBall(attackingTeam, defendingTeam, input, statsA, statsB, onLooseBall, onCounter);
      }
      return defendingTeam;
    }

    if (nextState === 'LOOSE_BALL') {
      return this.resolveLooseBall(attackingTeam, defendingTeam, input, statsA, statsB, onLooseBall, onCounter);
    }

    return defendingTeam;
  }

  private resolveLooseBall(
    attackingTeam: 'A' | 'B',
    defendingTeam: 'A' | 'B',
    input: GameSequenceInput,
    statsA: TeamSequenceStats,
    statsB: TeamSequenceStats,
    onLooseBall: () => void,
    onCounter: () => void
  ): 'A' | 'B' {
    onLooseBall();

    const currentStatsAtt = attackingTeam === 'A' ? statsA : statsB;
    const currentStatsDef = defendingTeam === 'A' ? statsA : statsB;

    const attTeamData = attackingTeam === 'A' ? input.teamA : input.teamB;
    const defTeamData = defendingTeam === 'A' ? input.teamA : input.teamB;
    const defPlaystyle = defendingTeam === 'A' ? input.playstyleA : input.playstyleB;

    const looseResult = this.simAzioneService.simulateLooseBall({
      attackerReactivity: (attTeamData.pressing * 0.6 + attTeamData.attack * 0.4) / 100,
      defenderReactivity: (defTeamData.defense * 0.6 + defTeamData.pressing * 0.4) / 100,
      defensiveLine: defPlaystyle.defensiveLine
    });

    if (looseResult.outcome === 'REBOUND_SHOT') {
      currentStatsAtt.looseBallsWon++;
      const reboundShotResult = this.simAzioneService.calculateShotXG({
        baseXG: looseResult.generatedBaseXG ?? 0.25,
        attacker: attTeamData.attack / 100,
        defender: defTeamData.defense / 100,
        goalkeeper: defTeamData.goalkeeper / 100
      });

      this.recordShot(currentStatsAtt, reboundShotResult, 'looseBall');
      return defendingTeam;
    } else if (looseResult.outcome === 'ATTACK_RETAINED') {
      currentStatsAtt.looseBallsWon++;
      return attackingTeam;
    } else if (looseResult.outcome === 'DEFENSE_CLEARED_LONG') {
      currentStatsDef.looseBallsWon++;
      onCounter();
      return defendingTeam;
    } else {
      currentStatsDef.looseBallsWon++;
      return defendingTeam;
    }
  }

  private createEmptyTeamStats(): TeamSequenceStats {
    return {
      goals: 0,
      totalXG: 0,
      xgPerShot: 0,
      possessionSharePercent: 50,
      xgByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0 },
      passesByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0, total: 0 },
      shots: { total: 0, onTarget: 0, blocked: 0, woodwork: 0 },
      cornersWon: 0,
      looseBallsWon: 0
    };
  }

  private finalizeTeamStats(statsA: TeamSequenceStats, statsB: TeamSequenceStats): void {
    statsA.xgByState.openPlay = Number(statsA.xgByState.openPlay.toFixed(2));
    statsA.xgByState.counterAttack = Number(statsA.xgByState.counterAttack.toFixed(2));
    statsA.xgByState.corner = Number(statsA.xgByState.corner.toFixed(2));
    statsA.xgByState.looseBall = Number(statsA.xgByState.looseBall.toFixed(2));
    statsA.totalXG = Number(statsA.totalXG.toFixed(2));

    statsB.xgByState.openPlay = Number(statsB.xgByState.openPlay.toFixed(2));
    statsB.xgByState.counterAttack = Number(statsB.xgByState.counterAttack.toFixed(2));
    statsB.xgByState.corner = Number(statsB.xgByState.corner.toFixed(2));
    statsB.xgByState.looseBall = Number(statsB.xgByState.looseBall.toFixed(2));
    statsB.totalXG = Number(statsB.totalXG.toFixed(2));

    statsA.xgPerShot = statsA.shots.total > 0
      ? Number((statsA.totalXG / statsA.shots.total).toFixed(3))
      : 0;

    statsB.xgPerShot = statsB.shots.total > 0
      ? Number((statsB.totalXG / statsB.shots.total).toFixed(3))
      : 0;

    const totalPasses = statsA.passesByState.total + statsB.passesByState.total;

    statsA.possessionSharePercent = totalPasses > 0
      ? Number(((statsA.passesByState.total / totalPasses) * 100).toFixed(1))
      : 50;

    statsB.possessionSharePercent = totalPasses > 0
      ? Number(((statsB.passesByState.total / totalPasses) * 100).toFixed(1))
      : 50;
  }
}