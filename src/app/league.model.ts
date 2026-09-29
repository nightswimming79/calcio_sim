import { GameSequenceResult } from "./sim-game.model";
import { PlaystyleConfig, TeamStats } from "./sim.model";

export interface LeagueTeam {
    id: string;
    name: string;
    stats: TeamStats;
    playstyle?: PlaystyleConfig; // Opzionale: se assente usa un playstyle bilanciato di default (0.5, 0.5)
}

export interface MatchResult {
    homeTeamId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamName: string;
    homeGoals: number;
    awayGoals: number;
    homeXG: number;
    awayXG: number;
    sequenceResult: GameSequenceResult;
}

export interface StandingEntry {
    rank: number;
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    xgFor: number;
    xgAgainst: number;
    xgDifference: number;
}

export interface LeagueResult {
    standings: StandingEntry[];
    matches: MatchResult[];
}