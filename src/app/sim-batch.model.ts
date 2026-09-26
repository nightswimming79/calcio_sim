import { GameSequenceInput, GameSequenceResult } from './sim-game.model';

export interface ParamRange {
    min: number;
    max: number;
    step: number;
}

export interface BatchConfig {
    iterationsPerScenario: number; // es. 1000
    strengthRatio: ParamRange;     // es. min: -20, max: 20, step: 20 (A debole, pari, A forte)
    attackA: ParamRange;           // es. min: 0.0, max: 1.0, step: 0.5
    defenseA: ParamRange;          // es. min: 0.0, max: 1.0, step: 0.5
    attackB: ParamRange;           // es. min: 0.0, max: 1.0, step: 0.5
    defenseB: ParamRange;          // es. min: 0.0, max: 1.0, step: 0.5
}

export interface ScenarioCoordinate {
    strengthRatio: number; // Delta forza tra Team A e Team B
    attackA: number;       // verticality Team A
    defenseA: number;      // defensiveLine Team A
    attackB: number;       // verticality Team B
    defenseB: number;      // defensiveLine Team B
}

export interface ScenarioBatchResult {
    coordinate: ScenarioCoordinate;
    input: GameSequenceInput;
    avgResult: GameSequenceResult; // Risultato medio sulle N simulazioni
}

export interface BatchExportDataset {
    meta: {
        timestamp: string;
        totalScenarios: number;
        iterationsPerScenario: number;
        batchConfig: BatchConfig;
    };
    data: ScenarioBatchResult[];
}