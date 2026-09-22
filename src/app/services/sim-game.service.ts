import { Injectable } from '@angular/core';
import { SimAzioneService } from './sim-azione.service';
import {
  GameSequenceInput,
  GameSequenceResult,
  TeamSequenceStats
} from '../sim-game.model';
import { SIM_CONFIG } from '../config/sim-config.const';

@Injectable({
  providedIn: 'root'
})
export class SimGameService {

  constructor(private simAzioneService: SimAzioneService) { }

  public simulateSequence(input: GameSequenceInput, N: number): GameSequenceResult {
    let counterAttacksCount = 0;
    let cornersCount = 0;
    let looseBallsCount = 0;

    const statsA: TeamSequenceStats = this.createEmptyTeamStats();
    const statsB: TeamSequenceStats = this.createEmptyTeamStats();

    const onCorner = () => cornersCount++;
    const onLooseBall = () => looseBallsCount++;
    const onCounter = () => counterAttacksCount++;

    // PRIMO TEMPO
    this.runHalfTime(N, 'A', input, statsA, statsB, onCorner, onLooseBall, onCounter);

    // SECONDO TEMPO
    this.runHalfTime(N, 'B', input, statsA, statsB, onCorner, onLooseBall, onCounter);

    this.finalizeTeamStats(statsA, statsB);

    return {
      totalActions: N * 2,
      sequenceDetails: { counterAttacksCount, cornersCount, looseBallsCount },
      statsA,
      statsB
    };
  }

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

      const possessionResult = this.simAzioneService.simulatePossession({
        attackingTeam: attTeamData,
        defendingTeam: defTeamData,
        attackingPlaystyle: attPlaystyle,
        defendingPlaystyle: defPlaystyle
      });

      const passes = possessionResult.passesCompleted ?? 1;
      currentStatsAtt.passesByState.openPlay += passes;
      currentStatsAtt.passesByState.total += passes;

      switch (possessionResult.outcome) {
        case 'CHANCE_CREATED': {
          const cfgShot = SIM_CONFIG.SHOT;
          const shotResult = this.simAzioneService.calculateShotXG({
            baseXG: possessionResult.generatedBaseXG ?? possessionResult.xG ?? SIM_CONFIG.POSSESSION.DEFAULT_OPEN_PLAY_XG,
            attacker: attTeamData.attack / cfgShot.STAT_DIVISOR,
            defender: (defTeamData.defense * cfgShot.DEFENDER_WEIGHT_DEFENSE + defTeamData.pressing * cfgShot.DEFENDER_WEIGHT_PRESSING) / cfgShot.STAT_DIVISOR,
            goalkeeper: defTeamData.goalkeeper / cfgShot.STAT_DIVISOR
          });

          this.recordShot(currentStatsAtt, shotResult, 'openPlay');

          currentPossession = this.resolveNextStateAfterShot(
            shotResult.nextState,
            attackingTeam,
            defendingTeam,
            'openPlay',
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
            defendingPlaystyle: attPlaystyle,
            counterAttackRisk: possessionResult.counterAttackRisk,
            highRecovery: possessionResult.highRecovery
          });

          const counterPasses = counterResult.passesCompleted ?? 1;
          currentStatsDef.passesByState.counterAttack += counterPasses;
          currentStatsDef.passesByState.total += counterPasses;

          if (counterResult.outcome === 'COUNTER_SHOT' || counterResult.outcome === 'COUNTER_CHANCE_CREATED') {
            const cfgShot = SIM_CONFIG.SHOT;
            const shotResult = this.simAzioneService.calculateShotXG({
              baseXG: counterResult.generatedBaseXG ?? counterResult.xG ?? SIM_CONFIG.COUNTER_ATTACK.DEFAULT_COUNTER_XG,
              attacker: defTeamData.attack / cfgShot.STAT_DIVISOR,
              defender: (attTeamData.defense * cfgShot.DEFENDER_WEIGHT_DEFENSE + attTeamData.pressing * cfgShot.DEFENDER_WEIGHT_PRESSING) / cfgShot.STAT_DIVISOR,
              goalkeeper: attTeamData.goalkeeper / cfgShot.STAT_DIVISOR
            });

            this.recordShot(currentStatsDef, shotResult, 'counterAttack');

            currentPossession = this.resolveNextStateAfterShot(
              shotResult.nextState,
              defendingTeam,
              attackingTeam,
              'counterAttack',
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
    sourceState: 'openPlay' | 'counterAttack' | 'corner' | 'looseBall',
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

      const cfgCorner = SIM_CONFIG.CORNER;
      const cornerResult = this.simAzioneService.simulateCorner({
        attackerAerial: (attTeamData.attack * cfgCorner.ATTACKER_AERIAL_WEIGHT + attTeamData.cornerAttack * cfgCorner.CORNER_ATTACK_WEIGHT) / SIM_CONFIG.SHOT.STAT_DIVISOR,
        defenderAerial: (defTeamData.defense * cfgCorner.DEFENDER_AERIAL_WEIGHT + defTeamData.cornerDefense * cfgCorner.CORNER_DEFENSE_WEIGHT) / SIM_CONFIG.SHOT.STAT_DIVISOR,
        goalkeeperExit: defTeamData.goalkeeper / SIM_CONFIG.SHOT.STAT_DIVISOR
      });

      currentStatsAtt.passesByState.corner += cfgCorner.PASSES_COUNT;
      currentStatsAtt.passesByState.total += cfgCorner.PASSES_COUNT;

      if (cornerResult.outcome === 'CORNER_SHOT') {
        const cornerShotResult = this.simAzioneService.calculateShotXG({
          baseXG: cornerResult.generatedBaseXG ?? cfgCorner.DEFAULT_CORNER_XG,
          attacker: attTeamData.attack / SIM_CONFIG.SHOT.STAT_DIVISOR,
          defender: defTeamData.cornerDefense / SIM_CONFIG.SHOT.STAT_DIVISOR,
          goalkeeper: defTeamData.goalkeeper / SIM_CONFIG.SHOT.STAT_DIVISOR
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

    const cfgLB = SIM_CONFIG.LOOSE_BALL;
    const looseResult = this.simAzioneService.simulateLooseBall({
      attackerReactivity: (attTeamData.pressing * cfgLB.ATTACKER_PRESSING_WEIGHT + attTeamData.attack * cfgLB.ATTACKER_ATTACK_WEIGHT) / SIM_CONFIG.SHOT.STAT_DIVISOR,
      defenderReactivity: (defTeamData.defense * cfgLB.DEFENDER_DEFENSE_WEIGHT + defTeamData.pressing * cfgLB.DEFENDER_PRESSING_WEIGHT) / SIM_CONFIG.SHOT.STAT_DIVISOR,
      defensiveLine: defPlaystyle.defensiveLine
    });

    if (looseResult.outcome === 'REBOUND_SHOT') {
      currentStatsAtt.looseBallsWon++;
      currentStatsAtt.passesByState.looseBall += cfgLB.PASSES_COUNT;
      currentStatsAtt.passesByState.total += cfgLB.PASSES_COUNT;

      const reboundShotResult = this.simAzioneService.calculateShotXG({
        baseXG: looseResult.generatedBaseXG ?? cfgLB.DEFAULT_REBOUND_XG,
        attacker: attTeamData.attack / SIM_CONFIG.SHOT.STAT_DIVISOR,
        defender: defTeamData.defense / SIM_CONFIG.SHOT.STAT_DIVISOR,
        goalkeeper: defTeamData.goalkeeper / SIM_CONFIG.SHOT.STAT_DIVISOR
      });

      this.recordShot(currentStatsAtt, reboundShotResult, 'looseBall');
      return defendingTeam;
    } else if (looseResult.outcome === 'ATTACK_RETAINED') {
      currentStatsAtt.looseBallsWon++;
      currentStatsAtt.passesByState.looseBall += cfgLB.PASSES_COUNT;
      currentStatsAtt.passesByState.total += cfgLB.PASSES_COUNT;
      return attackingTeam;
    } else if (looseResult.outcome === 'DEFENSE_CLEARED_LONG') {
      currentStatsDef.looseBallsWon++;
      currentStatsDef.passesByState.looseBall += cfgLB.PASSES_COUNT;
      currentStatsDef.passesByState.total += cfgLB.PASSES_COUNT;
      onCounter();
      return defendingTeam;
    } else {
      currentStatsDef.looseBallsWon++;
      currentStatsDef.passesByState.looseBall += cfgLB.PASSES_COUNT;
      currentStatsDef.passesByState.total += cfgLB.PASSES_COUNT;
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