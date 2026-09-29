import { Injectable } from '@angular/core';
import { PlaystyleConfig, TeamStats } from '../sim.model';
import { LeagueResult, LeagueTeam, MatchResult, StandingEntry } from '../league.model';
import { SimGameService } from './sim-game.service';
import { GameSequenceInput, GameSequenceResult } from '../sim-game.model';

@Injectable({
  providedIn: 'root'
})
export class LeagueService {

  constructor(private simGameService: SimGameService) { }

  /**
   * Simula un campionato completo (Andata e Ritorno) tra le squadre fornite.
   * 
   * @param teams Array di squadre partecipanti
   * @param N Numero di azioni per tempo (es. 50 per 100 azioni totali)
   * @param doubleRoundRobin Se true simula andata e ritorno, se false solo andata
   */
  public playLeague(teams: LeagueTeam[], N: number = 20, nRoundRobin: number = 2): LeagueResult {
    const defaultPlaystyle: PlaystyleConfig = { verticality: 0.5, defensiveLine: 0.5 };
    const matches: MatchResult[] = [];

    // Mappa interna per la contabilità della classifica
    const standingsMap = new Map<string, StandingEntry>();

    teams.forEach(team => {
      standingsMap.set(team.id, {
        rank: 0,
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        xgFor: 0,
        xgAgainst: 0,
        xgDifference: 0
      });
    });

    // 1. Generazione del calendario e simulazione delle partite
    for (let k = 0; k < nRoundRobin; k++) {
      for (let i = 0; i < teams.length; i++) {
        for (let j = 0; j < teams.length; j++) {
          if (i === j) continue; // Una squadra non gioca contro se stessa

          // Se solo andata, considera solo le coppie i < j
          if (i > j) continue;

          const homeTeam = teams[i];
          const awayTeam = teams[j];

          const input: GameSequenceInput = {
            teamA: homeTeam.stats,
            playstyleA: homeTeam.playstyle ?? defaultPlaystyle,
            teamB: awayTeam.stats,
            playstyleB: awayTeam.playstyle ?? defaultPlaystyle,
            startingPossession: Math.random() < 0.5 ? 'A' : 'B'
          };

          // Esecuzione simulazione partita
          const seqResult: GameSequenceResult = this.simGameService.simulateSequence(input, N);

          const match: MatchResult = {
            homeTeamId: homeTeam.id,
            homeTeamName: homeTeam.name,
            awayTeamId: awayTeam.id,
            awayTeamName: awayTeam.name,
            homeGoals: seqResult.statsA.goals,
            awayGoals: seqResult.statsB.goals,
            homeXG: Number(seqResult.statsA.totalXG.toFixed(2)),
            awayXG: Number(seqResult.statsB.totalXG.toFixed(2)),
            sequenceResult: seqResult
          };

          matches.push(match);

          // Aggiornamento statistiche squadre in classifica
          this.updateStandings(standingsMap, match);
        }
      }
    }

    // 2. Calcolo finale e ordinamento della classifica
    const standings = Array.from(standingsMap.values());
    this.sortStandings(standings);

    // Assegnazione posizione (Rank)
    standings.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return {
      standings,
      matches
    };
  }

  /**
   * Aggiorna i dati della classifica per casa e fuori casa in base all'esito del match
   */
  private updateStandings(map: Map<string, StandingEntry>, match: MatchResult): void {
    const home = map.get(match.homeTeamId)!;
    const away = map.get(match.awayTeamId)!;

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    home.xgFor += match.homeXG;
    home.xgAgainst += match.awayXG;
    away.xgFor += match.awayXG;
    away.xgAgainst += match.homeXG;

    if (match.homeGoals > match.awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeGoals < match.awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }

    // Arrotondamenti decimali puliti
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    home.xgFor = Number(home.xgFor.toFixed(2));
    home.xgAgainst = Number(home.xgAgainst.toFixed(2));
    home.xgDifference = Number((home.xgFor - home.xgAgainst).toFixed(2));

    away.xgFor = Number(away.xgFor.toFixed(2));
    away.xgAgainst = Number(away.xgAgainst.toFixed(2));
    away.xgDifference = Number((away.xgFor - away.xgAgainst).toFixed(2));
  }

  /**
   * Ordina la classifica in base ai criteri standard:
   * 1. Punti
   * 2. Differenza Reti
   * 3. Gol Fatti
   * 4. Differenza xG
   */
  private sortStandings(standings: StandingEntry[]): void {
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return b.xgDifference - a.xgDifference;
    });
  }
}