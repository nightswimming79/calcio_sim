import { Injectable } from '@angular/core';
import { SimGameService } from './sim-game.service';
import { SimAzioneService } from './sim-azione.service';
import { GameSequenceInput, GameSequenceResult, TeamSequenceStats } from '../sim-game.model';
import { TeamStats } from '../sim.model';
import {
  BatchConfig,
  ScenarioCoordinate,
  ScenarioBatchResult,
  BatchExportDataset
} from '../sim-batch.model';

@Injectable({
  providedIn: 'root'
})
export class SimBatchRunnerService {

  constructor(
    private simGameService: SimGameService,
    private simAzioneService: SimAzioneService
  ) { }

  /**
   * Genera i valori discrezionali da min a max con passo step.
   */
  private generateSteps(range: { min: number; max: number; step: number }): number[] {
    const steps: number[] = [];
    // Arrotondiamo per evitare problemi di precisione con numeri floating point
    for (let val = range.min; val <= range.max + 1e-9; val += range.step) {
      steps.push(Number(val.toFixed(2)));
    }
    return steps;
  }

  /**
   * Esegue l'intero batch su tutti i cicli annidati e scarica il file JSON.
   */
  public async runBatchAndDownload(
    config: BatchConfig,
    baseTeamA: TeamStats,
    baseTeamB: TeamStats,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const strengthSteps = this.generateSteps(config.strengthRatio);
    const attASteps = this.generateSteps(config.attackA);
    const defASteps = this.generateSteps(config.defenseA);
    const attBSteps = this.generateSteps(config.attackB);
    const defBSteps = this.generateSteps(config.defenseB);

    const totalScenarios =
      strengthSteps.length *
      attASteps.length *
      defASteps.length *
      attBSteps.length *
      defBSteps.length;

    const datasetResults: ScenarioBatchResult[] = [];
    let completed = 0;

    for (const strDelta of strengthSteps) {
      for (const attA of attASteps) {
        for (const defA of defASteps) {
          for (const attB of attBSteps) {
            for (const defB of defBSteps) {

              // 1. Definiamo le coordinate del punto di test
              const coordinate: ScenarioCoordinate = {
                strengthRatio: strDelta,
                attackA: attA,
                defenseA: defA,
                attackB: attB,
                defenseB: defB
              };

              // 2. Modifichiamo le stats e i playstyle di A e B in base alle coordinate
              const teamA: TeamStats = {
                ...baseTeamA,
                attack: baseTeamA.attack + strDelta,
                midfield: baseTeamA.midfield + strDelta,
                defense: baseTeamA.defense + strDelta
              };
              const teamB: TeamStats = { ...baseTeamB };

              const input: GameSequenceInput = {
                teamA,
                playstyleA: { verticality: attA, defensiveLine: defA },
                teamB,
                playstyleB: { verticality: attB, defensiveLine: defB },
                startingPossession: 'A'
              };

              // 3. Eseguiamo N iterazioni (es. 1000) per questo scenario
              const rawResults = this.simAzioneService.iterate<GameSequenceInput, GameSequenceResult>(
                (p) => this.simGameService.simulateSequence(p, 20),
                config.iterationsPerScenario,
                input
              );

              // 4. Calcoliamo l'oggetto aggregato con le medie di questo scenario
              const avgResult = this.aggregateResults(rawResults);

              datasetResults.push({
                coordinate,
                input,
                avgResult
              });

              completed++;
              if (onProgress) {
                onProgress(completed, totalScenarios);
              }

              // Permette al thread della UI di aggiornarsi senza congelare
              if (completed % 10 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 0));
              }
            }
          }
        }
      }
    }

    // 5. Costruiamo il payload completo e avviamo il download del file JSON
    const exportData: BatchExportDataset = {
      meta: {
        timestamp: new Date().toISOString(),
        totalScenarios,
        iterationsPerScenario: config.iterationsPerScenario,
        batchConfig: config
      },
      data: datasetResults
    };

    this.downloadJson(exportData, `sim_batch_${new Date().toISOString().slice(0, 10)}.json`);
  }

  /**
   * Calcola la media dei risultati di N simulazioni per uno scenario.
   */
  private aggregateResults(results: GameSequenceResult[]): GameSequenceResult {
    const count = results.length;
    if (count === 0) {
      throw new Error('Impossibile aggregare un array vuoto di risultati.');
    }

    const totalActions = results[0].totalActions;
    let sumCounters = 0, sumCorners = 0, sumLoose = 0;

    const statsA = this.createZeroStats();
    const statsB = this.createZeroStats();

    for (const r of results) {
      sumCounters += r.sequenceDetails.counterAttacksCount;
      sumCorners += r.sequenceDetails.cornersCount;
      sumLoose += r.sequenceDetails.looseBallsCount;

      this.accumulateTeamStats(statsA, r.statsA);
      this.accumulateTeamStats(statsB, r.statsB);
    }

    return {
      totalActions,
      sequenceDetails: {
        counterAttacksCount: Number((sumCounters / count).toFixed(2)),
        cornersCount: Number((sumCorners / count).toFixed(2)),
        looseBallsCount: Number((sumLoose / count).toFixed(2))
      },
      statsA: this.averageTeamStats(statsA, count),
      statsB: this.averageTeamStats(statsB, count)
    };
  }

  private createZeroStats(): TeamSequenceStats {
    return {
      goals: 0,
      totalXG: 0,
      xgPerShot: 0,
      possessionSharePercent: 0,
      xgByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0 },
      passesByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0, total: 0 },
      shots: { total: 0, onTarget: 0, blocked: 0, woodwork: 0 },
      cornersWon: 0,
      looseBallsWon: 0
    };
  }

  private accumulateTeamStats(target: TeamSequenceStats, src: TeamSequenceStats): void {
    target.goals += src.goals;
    target.totalXG += src.totalXG;
    target.xgPerShot += src.xgPerShot;
    target.possessionSharePercent += src.possessionSharePercent;

    target.xgByState.openPlay += src.xgByState.openPlay;
    target.xgByState.counterAttack += src.xgByState.counterAttack;
    target.xgByState.corner += src.xgByState.corner;
    target.xgByState.looseBall += src.xgByState.looseBall;

    target.passesByState.openPlay += src.passesByState.openPlay;
    target.passesByState.counterAttack += src.passesByState.counterAttack;
    target.passesByState.corner += src.passesByState.corner;
    target.passesByState.looseBall += src.passesByState.looseBall;
    target.passesByState.total += src.passesByState.total;

    target.shots.total += src.shots.total;
    target.shots.onTarget += src.shots.onTarget;
    target.shots.blocked += src.shots.blocked;
    target.shots.woodwork += src.shots.woodwork;

    target.cornersWon += src.cornersWon;
    target.looseBallsWon += src.looseBallsWon;
  }

  private averageTeamStats(sum: TeamSequenceStats, N: number): TeamSequenceStats {
    return {
      goals: Number((sum.goals / N).toFixed(2)),
      totalXG: Number((sum.totalXG / N).toFixed(2)),
      xgPerShot: Number((sum.xgPerShot / N).toFixed(3)),
      possessionSharePercent: Number((sum.possessionSharePercent / N).toFixed(1)),
      xgByState: {
        openPlay: Number((sum.xgByState.openPlay / N).toFixed(2)),
        counterAttack: Number((sum.xgByState.counterAttack / N).toFixed(2)),
        corner: Number((sum.xgByState.corner / N).toFixed(2)),
        looseBall: Number((sum.xgByState.looseBall / N).toFixed(2))
      },
      passesByState: {
        openPlay: Number((sum.passesByState.openPlay / N).toFixed(1)),
        counterAttack: Number((sum.passesByState.counterAttack / N).toFixed(1)),
        corner: Number((sum.passesByState.corner / N).toFixed(1)),
        looseBall: Number((sum.passesByState.looseBall / N).toFixed(1)),
        total: Number((sum.passesByState.total / N).toFixed(1))
      },
      shots: {
        total: Number((sum.shots.total / N).toFixed(2)),
        onTarget: Number((sum.shots.onTarget / N).toFixed(2)),
        blocked: Number((sum.shots.blocked / N).toFixed(2)),
        woodwork: Number((sum.shots.woodwork / N).toFixed(2))
      },
      cornersWon: Number((sum.cornersWon / N).toFixed(2)),
      looseBallsWon: Number((sum.looseBallsWon / N).toFixed(2))
    };
  }

  private downloadJson(data: any, filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
  }
}