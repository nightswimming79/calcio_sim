import * as fs from 'fs';
import * as path from 'path';
import { LeagueService } from '../src/app/services/league.service';
import { SimGameService } from '../src/app/services/sim-game.service';
import { LeagueTeam } from '../src/app/league.model';
import { SimAzioneService } from '../src/app/services/sim-azione.service';
import { TeamStats } from '../src/app/sim.model';

type StatName =
    | 'midfield'
    | 'playmaking'
    | 'attack'
    | 'defense'
    | 'pressing'
    | 'goalkeeper'
    | 'cornerAttack'
    | 'cornerDefense';

function createSpecializedStats(specialty: StatName, specialVal: number = 80, baseVal: number = 70): TeamStats {
    const baseValues = {
        midfield: baseVal,
        playmaking: baseVal,
        attack: baseVal,
        defense: baseVal,
        pressing: baseVal,
        goalkeeper: baseVal,
        cornerAttack: baseVal,
        cornerDefense: baseVal
    };

    return new TeamStats({
        ...baseValues,
        [specialty]: specialVal
    });
}

function runSpecializedLeagueBatch(iterations: number = 100) {
    console.log(`=== AVVIO SIMULAZIONE BATCH PARALLELA (6 SQUADRE SPECIALIZZATE - ${iterations} ITERAZIONI) ===\n`);

    const simAzioneService = new SimAzioneService();
    const simGameService = new SimGameService(simAzioneService);
    const leagueService = new LeagueService(simGameService);

    const tacticsList = [
        { verticality: 0.5, defensiveLine: 0.5 }, // Default
        { verticality: 0.2, defensiveLine: 0.5 },
        { verticality: 0.8, defensiveLine: 0.5 },
    ];

    const getTacticsSuffix = (t: { verticality: number; defensiveLine: number }) => {
        if (t.verticality === 0.5 && t.defensiveLine === 0.5) return 'Def';
        return `V${t.verticality * 10}-D${t.defensiveLine * 10}`;
    };

    const baseSpecs: { id: string; name: string; stat: StatName; val: number }[] = [
        { id: 'SQ_MID', name: 'FC Midfield 65', stat: 'midfield', val: 65 },
        { id: 'SQ_PLAY', name: 'FC Playmaking 65', stat: 'playmaking', val: 65 },
        { id: 'SQ_ATT', name: 'FC Attack 65', stat: 'attack', val: 65 },
        { id: 'SQ_DEF', name: 'FC Defense 65', stat: 'defense', val: 65 },
        { id: 'SQ_PRESS', name: 'FC Pressing 65', stat: 'pressing', val: 65 },
        { id: 'SQ_GK', name: 'FC Goalkeeper 65', stat: 'goalkeeper', val: 50 },
    ];

    const teams: LeagueTeam[] = baseSpecs.flatMap(base =>
        tacticsList.map(tactics => {
            const suffix = getTacticsSuffix(tactics);
            return {
                id: `${base.id}_${suffix}`,
                name: `${base.name} [${suffix}]`,
                stats: createSpecializedStats(base.stat, base.val, 50),
                playstyle: tactics
            };
        })
    );

    const aggregatedStats = new Map<string, {
        name: string;
        totalPoints: number;
        totalGF: number;
        totalGS: number;
        totalXGF: number;
        totalXGS: number;
        totalActionsFor: number;
        totalActionsAgainst: number;
        totalPossessionPct: number;
        totalCounterXGF: number;
        totalCounterXGS: number;
        wins: number;
        draws: number;
        losses: number;
        titlesWon: number;
    }>();

    teams.forEach(t => {
        aggregatedStats.set(t.id, {
            name: t.name,
            totalPoints: 0,
            totalGF: 0,
            totalGS: 0,
            totalXGF: 0,
            totalXGS: 0,
            totalActionsFor: 0,
            totalActionsAgainst: 0,
            totalPossessionPct: 0,
            totalCounterXGF: 0,
            totalCounterXGS: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            titlesWon: 0
        });
    });

    console.log(`Simulazione di ${iterations} campionati in corso...`);

    for (let i = 0; i < iterations; i++) {
        const result = leagueService.playLeague(teams, 20, 200);
        console.log(`Iterazione ${i + 1}...`);

        result.standings.forEach((s, index) => {
            const agg = aggregatedStats.get(s.teamId)!;
            agg.totalPoints += s.points;
            agg.totalGF += s.goalsFor;
            agg.totalGS += s.goalsAgainst;
            agg.totalXGF += s.xgFor;
            agg.totalXGS += s.xgAgainst;

            // Aggregazione delle nuove metriche (da adeguare se i nomi delle proprietà differiscono leggermente nel tuo model)
            agg.totalActionsFor += (s as any).actionsFor ?? 0;
            agg.totalActionsAgainst += (s as any).actionsAgainst ?? 0;
            agg.totalPossessionPct += (s as any).possessionPct ?? 0;
            agg.totalCounterXGF += (s as any).counterXgFor ?? 0;
            agg.totalCounterXGS += (s as any).counterXgAgainst ?? 0;

            agg.wins += s.won;
            agg.draws += s.drawn;
            agg.losses += s.lost;

            if (index === 0) {
                agg.titlesWon += 1;
            }
        });
    }

    // Calcolo medie
    const summary = Array.from(aggregatedStats.values()).map(s => ({
        name: s.name,
        avgPoints: (s.totalPoints / iterations).toFixed(2),
        avgGF: (s.totalGF / iterations).toFixed(2),
        avgGS: (s.totalGS / iterations).toFixed(2),
        avgDR: ((s.totalGF - s.totalGS) / iterations).toFixed(2),
        avgXGF: (s.totalXGF / iterations).toFixed(2),
        avgXGS: (s.totalXGS / iterations).toFixed(2),
        avgActionsFor: (s.totalActionsFor / iterations).toFixed(1),
        avgActionsAgainst: (s.totalActionsAgainst / iterations).toFixed(1),
        avgPossession: (s.totalPossessionPct / iterations).toFixed(1),
        avgCounterXGF: (s.totalCounterXGF / iterations).toFixed(2),
        avgCounterXGS: (s.totalCounterXGS / iterations).toFixed(2),
        titleWinRate: `${((s.titlesWon / iterations) * 100).toFixed(1)}%`
    }));

    summary.sort((a, b) => Number(b.avgPoints) - Number(a.avgPoints));

    // Generazione report
    let out = `===================================================================================================================================================\n`;
    out += `                                    REPORT COMPARATIVO ATTRIBUTI SPECIALIZZATI (MEDIA SU ${iterations} CAMPIONATI)\n`;
    out += `===================================================================================================================================================\n`;
    out += `Configurazione: ${teams.length} squadre\n`;
    out += `Data esecuzione: ${new Date().toLocaleString()}\n\n`;

    out += `---------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `CLASSIFICA MEDIATA SULLE SIMULAZIONI\n`;
    out += `---------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `POS | SQUADRA             | PT MEDI | GF MEDI | GS MEDI | DR MEDI | xGF MEDI | xGS MEDI | AZ. FATTE | AZ. SUB | POSS % | xG CTR+ | xG CTR- | TITOLI VINTI\n`;
    out += `---------------------------------------------------------------------------------------------------------------------------------------------------\n`;

    summary.forEach((s, idx) => {
        const pos = String(idx + 1).padStart(2, ' ');
        const name = s.name.padEnd(19, ' ');
        const pts = String(s.avgPoints).padStart(7, ' ');
        const gf = String(s.avgGF).padStart(7, ' ');
        const gs = String(s.avgGS).padStart(7, ' ');
        const dr = String(s.avgDR).padStart(7, ' ');
        const xgf = String(s.avgXGF).padStart(8, ' ');
        const xgs = String(s.avgXGS).padStart(8, ' ');
        const actF = String(s.avgActionsFor).padStart(9, ' ');
        const actA = String(s.avgActionsAgainst).padStart(8, ' ');
        const poss = String(`${s.avgPossession}%`).padStart(6, ' ');
        const ctrF = String(s.avgCounterXGF).padStart(7, ' ');
        const ctrA = String(s.avgCounterXGS).padStart(7, ' ');
        const winRate = String(s.titleWinRate).padStart(12, ' ');

        out += `${pos}  | ${name} | ${pts} | ${gf} | ${gs} | ${dr} | ${xgf} | ${xgs} | ${actF} | ${actA} | ${poss} | ${ctrF} | ${ctrA} | ${winRate}\n`;
    });

    out += `---------------------------------------------------------------------------------------------------------------------------------------------------\n`;

    console.log(out);

    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `specialized_league_results_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, out, 'utf-8');
    console.log(`[FILE GENERATO] Report comparativo salvato in:\n${outputPath}\n`);
}

runSpecializedLeagueBatch(100);