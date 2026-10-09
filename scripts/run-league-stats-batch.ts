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

interface TeamAccumulator {
    name: string;
    statName: StatName;
    verticality: number;
    defensiveLine: number;
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
    totalMaxPassSequence: number;
    wins: number;
    draws: number;
    losses: number;
    titlesWon: number;
}

interface GroupDimensionStats {
    groupKey: string;
    teamCount: number;
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
    totalMaxPassSequence: number;
    titlesWon: number;
}

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

function formatTableGroup(title: string, data: GroupDimensionStats[], iterations: number): string {
    let out = `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `${title}\n`;
    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `POS | GRUPPO              | PT MEDI | GF MEDI | GS MEDI | DR MEDI | xGF MEDI | xGS MEDI | AZ. FATTE | AZ. SUB | POSS % | xG CTR+ | xG CTR- | MAX PASS. | TITOLI VINTI\n`;
    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;

    data.forEach((g, idx) => {
        const factor = iterations * g.teamCount;
        const pos = String(idx + 1).padStart(2, ' ');
        const name = g.groupKey.padEnd(19, ' ');
        const pts = (g.totalPoints / factor).toFixed(2).padStart(7, ' ');
        const gf = (g.totalGF / factor).toFixed(2).padStart(7, ' ');
        const gs = (g.totalGS / factor).toFixed(2).padStart(7, ' ');
        const dr = ((g.totalGF - g.totalGS) / factor).toFixed(2).padStart(7, ' ');
        const xgf = (g.totalXGF / factor).toFixed(2).padStart(8, ' ');
        const xgs = (g.totalXGS / factor).toFixed(2).padStart(8, ' ');
        const actF = (g.totalActionsFor / factor).toFixed(1).padStart(9, ' ');
        const actA = (g.totalActionsAgainst / factor).toFixed(1).padStart(8, ' ');
        const poss = `${(g.totalPossessionPct / factor).toFixed(1)}%`.padStart(6, ' ');
        const ctrF = (g.totalCounterXGF / factor).toFixed(2).padStart(7, ' ');
        const ctrA = (g.totalCounterXGS / factor).toFixed(2).padStart(7, ' ');
        const maxPass = (g.totalMaxPassSequence / factor).toFixed(1).padStart(9, ' ');
        const winRate = `${((g.titlesWon / iterations) * 100).toFixed(1)}%`.padStart(12, ' ');

        out += `${pos}  | ${name} | ${pts} | ${gf} | ${gs} | ${dr} | ${xgf} | ${xgs} | ${actF} | ${actA} | ${poss} | ${ctrF} | ${ctrA} | ${maxPass} | ${winRate}\n`;
    });

    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n\n`;
    return out;
}

function runSpecializedLeagueBatch(iterations: number = 100) {
    console.log(`=== AVVIO SIMULAZIONE BATCH PARALLELA (54 SQUADRE SPECIALIZZATE - ${iterations} ITERAZIONI) ===\n`);

    const simAzioneService = new SimAzioneService();
    const simGameService = new SimGameService(simAzioneService);
    const leagueService = new LeagueService(simGameService);

    const tacticsList = [
        { verticality: 0.5, defensiveLine: 0.5 },
        { verticality: 0.2, defensiveLine: 0.5 },
        { verticality: 0.8, defensiveLine: 0.5 },
        { verticality: 0.5, defensiveLine: 0.2 },
        { verticality: 0.5, defensiveLine: 0.8 },
        { verticality: 0.8, defensiveLine: 0.8 },
        { verticality: 0.2, defensiveLine: 0.8 },
        { verticality: 0.8, defensiveLine: 0.2 },
        { verticality: 0.2, defensiveLine: 0.2 }
    ];

    const getTacticsSuffix = (t: { verticality: number; defensiveLine: number }) => {
        return `V${Math.round(t.verticality * 10)}-D${Math.round(t.defensiveLine * 10)}`;
    };

    const baseSpecs: { id: string; name: string; stat: StatName; val: number }[] = [
        { id: 'SQ_MID', name: 'FC Midfield 65', stat: 'midfield', val: 65 },
        { id: 'SQ_PLAY', name: 'FC Playmaking 65', stat: 'playmaking', val: 65 },
        { id: 'SQ_ATT', name: 'FC Attack 65', stat: 'attack', val: 65 },
        { id: 'SQ_DEF', name: 'FC Defense 65', stat: 'defense', val: 65 },
        { id: 'SQ_PRESS', name: 'FC Pressing 65', stat: 'pressing', val: 65 },
        { id: 'SQ_GK', name: 'FC Goalkeeper 65', stat: 'goalkeeper', val: 50 }
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

    const aggregatedStats = new Map<string, TeamAccumulator>();

    baseSpecs.forEach(base => {
        tacticsList.forEach(tactics => {
            const suffix = getTacticsSuffix(tactics);
            const teamId = `${base.id}_${suffix}`;
            aggregatedStats.set(teamId, {
                name: `${base.name} [${suffix}]`,
                statName: base.stat,
                verticality: tactics.verticality,
                defensiveLine: tactics.defensiveLine,
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
                totalMaxPassSequence: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                titlesWon: 0
            });
        });
    });

    console.log(`Simulazione di ${iterations} campionati in corso...`);

    for (let i = 0; i < iterations; i++) {
        const result = leagueService.playLeague(teams, 20, 20);
        if ((i + 1) % 10 === 0 || i === 0) {
            console.log(`Iterazione ${i + 1}/${iterations}...`);
        }

        result.standings.forEach((s, index) => {
            const agg = aggregatedStats.get(s.teamId)!;
            agg.totalPoints += s.points;
            agg.totalGF += s.goalsFor;
            agg.totalGS += s.goalsAgainst;
            agg.totalXGF += s.xgFor;
            agg.totalXGS += s.xgAgainst;

            agg.totalActionsFor += s.actionsFor ?? 0;
            agg.totalActionsAgainst += s.actionsAgainst ?? 0;
            agg.totalPossessionPct += s.possessionPct ?? 0;
            agg.totalCounterXGF += s.counterXgFor ?? 0;
            agg.totalCounterXGS += s.counterXgAgainst ?? 0;
            agg.totalMaxPassSequence += s.maxPassSequence ?? 0;

            agg.wins += s.won;
            agg.draws += s.drawn;
            agg.losses += s.lost;

            if (index === 0) {
                agg.titlesWon += 1;
            }
        });
    }

    // --- FUNZIONE DI RAGGRUPPAMENTO ORTOGONALE ---
    const buildGroupStats = (groupByFn: (item: TeamAccumulator) => string): GroupDimensionStats[] => {
        const groupsMap = new Map<string, GroupDimensionStats>();

        aggregatedStats.forEach(item => {
            const key = groupByFn(item);
            if (!groupsMap.has(key)) {
                groupsMap.set(key, {
                    groupKey: key,
                    teamCount: 0,
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
                    totalMaxPassSequence: 0,
                    titlesWon: 0
                });
            }

            const g = groupsMap.get(key)!;
            g.teamCount += 1;
            g.totalPoints += item.totalPoints;
            g.totalGF += item.totalGF;
            g.totalGS += item.totalGS;
            g.totalXGF += item.totalXGF;
            g.totalXGS += item.totalXGS;
            g.totalActionsFor += item.totalActionsFor;
            g.totalActionsAgainst += item.totalActionsAgainst;
            g.totalPossessionPct += item.totalPossessionPct;
            g.totalCounterXGF += item.totalCounterXGF;
            g.totalCounterXGS += item.totalCounterXGS;
            g.totalMaxPassSequence += item.totalMaxPassSequence;
            g.titlesWon += item.titlesWon;
        });

        const list = Array.from(groupsMap.values());
        list.sort((a, b) => (b.totalPoints / (iterations * b.teamCount)) - (a.totalPoints / (iterations * a.teamCount)));
        return list;
    };

    // 1. Gruppo Profilo Rosa
    const profileStats = buildGroupStats(item => item.statName);

    // 2. Gruppo Verticalità (V)
    const verticalityStats = buildGroupStats(item => `V${Math.round(item.verticality * 10)}`);

    // 3. Gruppo Linea Difensiva (D)
    const defensiveLineStats = buildGroupStats(item => `D${Math.round(item.defensiveLine * 10)}`);

    // --- GENERAZIONE REPORT ---
    let out = `=================================================================================================================================================================\n`;
    out += `                                    REPORT SIMULAZIONE E ANALISI AGGREGATA ORTOGONALE (${iterations} CAMPIONATI)\n`;
    out += `=================================================================================================================================================================\n`;
    out += `Configurazione: ${teams.length} squadre (6 Profili Rosa x 9 Combinazioni V/D)\n`;
    out += `Data esecuzione: ${new Date().toLocaleString()}\n\n`;

    out += formatTableGroup('1. AGGREGATO PER PROFILO ROSA (STATNAME)', profileStats, iterations);
    out += formatTableGroup('2. AGGREGATO PER VERTICALITÀ (V)', verticalityStats, iterations);
    out += formatTableGroup('3. AGGREGATO PER LINEA DIFENSIVA (D)', defensiveLineStats, iterations);

    // Classifica Completa per Singola Squadra
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
        avgMaxPassSequence: (s.totalMaxPassSequence / iterations).toFixed(1),
        titleWinRate: `${((s.titlesWon / iterations) * 100).toFixed(1)}%`
    }));

    summary.sort((a, b) => Number(b.avgPoints) - Number(a.avgPoints));

    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `4. CLASSIFICA COMPLETA SQUADRE (${teams.length} SQUADRE)\n`;
    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;
    out += `POS | SQUADRA             | PT MEDI | GF MEDI | GS MEDI | DR MEDI | xGF MEDI | xGS MEDI | AZ. FATTE | AZ. SUB | POSS % | xG CTR+ | xG CTR- | MAX PASS. | TITOLI VINTI\n`;
    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;

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
        const maxPass = String(s.avgMaxPassSequence).padStart(9, ' ');
        const winRate = String(s.titleWinRate).padStart(12, ' ');

        out += `${pos}  | ${name} | ${pts} | ${gf} | ${gs} | ${dr} | ${xgf} | ${xgs} | ${actF} | ${actA} | ${poss} | ${ctrF} | ${ctrA} | ${maxPass} | ${winRate}\n`;
    });

    out += `-----------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;

    console.log(out);

    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `specialized_league_aggregated_results_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, out, 'utf-8');
    console.log(`[FILE GENERATO] Report salvato in:\n${outputPath}\n`);
}

runSpecializedLeagueBatch(100);