import * as fs from 'fs';
import * as path from 'path';
import { LeagueService } from '../src/app/services/league.service';
import { SimGameService } from '../src/app/services/sim-game.service';
import { LeagueTeam } from '../src/app/league.model';
import { SimAzioneService } from '../src/app/services/sim-azione.service';
import { TeamStats } from '../src/app/sim.model';

function pointsToStats(points: number): number {
    return points / 2 + 40;
}

// Istanziazione corretta della classe TeamStats tramite new
function createStats(val: number): TeamStats {
    return new TeamStats({
        midfield: val,
        playmaking: val,
        attack: val,
        defense: val,
        pressing: val,
        goalkeeper: val,
        cornerAttack: val,
        cornerDefense: val
    });
}

function runLeagueBatch() {
    console.log('=== AVVIO SIMULAZIONE CAMPIONATO BATCH ===\n');

    // 1. Inizializzazione Servizi
    const simAzioneService = new SimAzioneService();
    const simGameService = new SimGameService(simAzioneService);
    const leagueService = new LeagueService(simGameService);

    // Tattica standard fissa a 50 (convertita su scala 0.0 - 1.0)
    const defaultTactics = {
        verticality: 0.5,
        defensiveLine: 0.5
    };

    // 2. Definizione delle 20 squadre con TeamStats
    const teams: LeagueTeam[] = [
        { id: 'ARSENAL', name: 'Arsenal', stats: createStats(pointsToStats(85)), playstyle: defaultTactics },
        { id: 'MANCITY', name: 'Man City', stats: createStats(pointsToStats(78)), playstyle: defaultTactics },
        { id: 'MANUTD', name: 'Man Utd', stats: createStats(pointsToStats(71)), playstyle: defaultTactics },
        { id: 'ASTONVILLA', name: 'Aston Villa', stats: createStats(pointsToStats(65)), playstyle: defaultTactics },
        { id: 'LIVERPOOL', name: 'Liverpool', stats: createStats(pointsToStats(60)), playstyle: defaultTactics },
        { id: 'BOURNEMOUTH', name: 'Bournemouth', stats: createStats(pointsToStats(57)), playstyle: defaultTactics },
        { id: 'SUNDERLAND', name: 'Sunderland', stats: createStats(pointsToStats(54)), playstyle: defaultTactics },
        { id: 'BRIGHTON', name: 'Brighton', stats: createStats(pointsToStats(53)), playstyle: defaultTactics },
        { id: 'BRENTFORD', name: 'Brentford', stats: createStats(pointsToStats(53)), playstyle: defaultTactics },
        { id: 'CHELSEA', name: 'Chelsea', stats: createStats(pointsToStats(52)), playstyle: defaultTactics },
        { id: 'FULHAM', name: 'Fulham', stats: createStats(pointsToStats(52)), playstyle: defaultTactics },
        { id: 'NEWCASTLE', name: 'Newcastle', stats: createStats(pointsToStats(49)), playstyle: defaultTactics },
        { id: 'EVERTON', name: 'Everton', stats: createStats(pointsToStats(49)), playstyle: defaultTactics },
        { id: 'LEEDS', name: 'Leeds', stats: createStats(pointsToStats(47)), playstyle: defaultTactics },
        { id: 'PALACE', name: 'Palace', stats: createStats(pointsToStats(45)), playstyle: defaultTactics },
        { id: 'NOTTMFOREST', name: 'Nottm Forest', stats: createStats(pointsToStats(44)), playstyle: defaultTactics },
        { id: 'SPURS', name: 'Spurs', stats: createStats(pointsToStats(41)), playstyle: defaultTactics },
        { id: 'WESTHAM', name: 'West Ham', stats: createStats(pointsToStats(39)), playstyle: defaultTactics },
        { id: 'BURNLEY', name: 'Burnley', stats: createStats(pointsToStats(22)), playstyle: defaultTactics },
        { id: 'WOLVES', name: 'Wolves', stats: createStats(pointsToStats(20)), playstyle: defaultTactics },
    ];

    // 3. Esecuzione Campionato
    const result = leagueService.playLeague(teams, 20, 200);

    // 4. Formattazione dell'output in formato testo
    let out = `====================================================================================\n`;
    out += `                        REPORT SIMULAZIONE CAMPIONATO\n`;
    out += `====================================================================================\n`;
    out += `Data simulazione: ${new Date().toLocaleString()}\n`;
    out += `Squadre partecipanti: ${teams.length}\n`;
    out += `Partite totali giocate: ${result.matches.length}\n\n`;

    out += `------------------------------------------------------------------------------------\n`;
    out += `CLASSIFICA FINALE\n`;
    out += `------------------------------------------------------------------------------------\n`;
    out += `POS | SQUADRA        | PT | G  | V  | N  | P  | GF  | GS  | DR   | xGF   | xGS   | xGDR\n`;
    out += `------------------------------------------------------------------------------------\n`;

    result.standings.forEach(s => {
        const pos = String(s.rank).padStart(2, ' ');
        const name = s.teamName.padEnd(14, ' ');
        const pts = String(s.points).padStart(2, ' ');
        const p = String(s.played).padStart(2, ' ');
        const w = String(s.won).padStart(2, ' ');
        const d = String(s.drawn).padStart(2, ' ');
        const l = String(s.lost).padStart(2, ' ');
        const gf = String(s.goalsFor).padStart(3, ' ');
        const gs = String(s.goalsAgainst).padStart(3, ' ');
        const dr = String(s.goalDifference).padStart(4, ' ');
        const xgf = s.xgFor.toFixed(1).padStart(5, ' ');
        const xgs = s.xgAgainst.toFixed(1).padStart(5, ' ');
        const xgdr = s.xgDifference.toFixed(1).padStart(5, ' ');

        out += `${pos}  | ${name} | ${pts} | ${p} | ${w} | ${d} | ${l} | ${gf} | ${gs} | ${dr} | ${xgf} | ${xgs} | ${xgdr}\n`;
    });

    out += `------------------------------------------------------------------------------------\n\n`;

    out += `------------------------------------------------------------------------------------\n`;
    out += `RISULTATI PARTITE DETTAGLIATI\n`;
    out += `------------------------------------------------------------------------------------\n`;

    result.matches.forEach((m, idx) => {
        const num = String(idx + 1).padStart(2, ' ');
        const home = m.homeTeamName.padEnd(12, ' ');
        const away = m.awayTeamName.padStart(12, ' ');
        const score = `${m.homeGoals} - ${m.awayGoals}`;
        const xg = `(xG: ${m.homeXG.toFixed(2)} - ${m.awayXG.toFixed(2)})`;

        out += `[${num}] ${home}  ${score.padStart(5, ' ')}  ${away}   ${xg}\n`;
    });

    out += `------------------------------------------------------------------------------------\n`;

    // 5. Stampa a console e salvataggio del file .txt
    console.log(out);

    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `league_results_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, out, 'utf-8');
    console.log(`[FILE GENERATO] Risultati della lega salvati in:\n${outputPath}\n`);
}

// Esecuzione diretta
runLeagueBatch();