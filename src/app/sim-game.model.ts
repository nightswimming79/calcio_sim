import { TeamStats, PlaystyleConfig } from './sim.model';

export { TeamStats, PlaystyleConfig };

export interface GameSequenceInput {
    teamA: TeamStats;
    playstyleA: PlaystyleConfig;
    teamB: TeamStats;
    playstyleB: PlaystyleConfig;
    startingPossession: 'A' | 'B';
}

export interface TeamSequenceStats {
    goals: number;
    totalXG: number;
    xgPerShot: number;
    possessionSharePercent: number;
    xgByState: {
        openPlay: number;
        counterAttack: number;
        corner: number;
        looseBall: number;
    };
    passesByState: {
        openPlay: number;
        counterAttack: number;
        corner: number;
        looseBall: number;
        total: number;
    };
    shots: {
        total: number;
        onTarget: number;
        blocked: number;
        woodwork: number;
    };
    cornersWon: number;
    looseBallsWon: number;
}

export interface GameSequenceResult {
    totalActions: number;
    sequenceDetails: {
        counterAttacksCount: number;
        cornersCount: number;
        looseBallsCount: number;
    };
    statsA: TeamSequenceStats;
    statsB: TeamSequenceStats;
}