import * as fs from 'fs';
import * as path from 'path';

// Import del file di configurazione
import { SIM_CONFIG } from '../src/app/config/sim-config.const';

// Interfacce reali del progetto
export interface TeamStats {
    midfield: number;      // 0 - 100
    playmaking: number;     // 0 - 100
    attack: number;         // 0 - 100
    defense: number;        // 0 - 100
    pressing: number;       // 0 - 100
    goalkeeper: number;     // 0 - 100
    cornerAttack: number;   // 0 - 100
    cornerDefense: number;  // 0 - 100
}

export interface PlaystyleConfig {
    verticality: number;    // 0.0 - 1.0
    defensiveLine: number;  // 0.0 - 1.0
}

export interface GameSequenceInput {
    teamA: TeamStats;
    playstyleA: PlaystyleConfig;
    teamB: TeamStats;
    playstyleB: PlaystyleConfig;
    startingPossession: 'A' | 'B';
}

// Import dei servizi reali della simulazione
import { SimAzioneService } from '../src/app/services/sim-azione.service';
import { SimGameService } from '../src/app/services/sim-game.service';

// --- CONFIGURAZIONE RANGE BATCH ---
const ITERATIONS_PER_SCENARIO = 1000;

const RANGES = {
    strengthRatio: { min: -3, max: 20, step: 1 },  // Delta da -15 a +15 (31 valori)
    attackA: { min: 0, max: 100, step: 50 },  // 0, 50, 100
    defenseA: { min: 0, max: 100, step: 50 },  // 0, 50, 100
    attackB: { min: 0, max: 100, step: 50 },  // 0, 50, 100
    defenseB: { min: 0, max: 100, step: 50 }   // 0, 50, 100
};

function generateSteps(range: { min: number; max: number; step: number }): number[] {
    const steps: number[] = [];
    for (let val = range.min; val <= range.max + 1e-9; val += range.step) {
        steps.push(Number(val.toFixed(2)));
    }
    return steps;
}

const simAzioneService = new SimAzioneService();
const simGameService = new SimGameService(simAzioneService);

const BASE_STATS_VALUE = 50;

async function executeBatch() {
    console.log('=== AVVIO BATCH BROWSERLESS ===');
    const startTime = Date.now();

    const strengthSteps = generateSteps(RANGES.strengthRatio);
    const attASteps = generateSteps(RANGES.attackA);
    const defASteps = generateSteps(RANGES.defenseA);
    const attBSteps = generateSteps(RANGES.attackB);
    const defBSteps = generateSteps(RANGES.defenseB);

    const totalScenarios =
        strengthSteps.length * attASteps.length * defASteps.length * attBSteps.length * defBSteps.length;

    console.log(`Scenari totali: ${totalScenarios}`);
    console.log(`Iterazioni per scenario: ${ITERATIONS_PER_SCENARIO}`);
    console.log(`Totale simulazioni da calcolare: ${totalScenarios * ITERATIONS_PER_SCENARIO}\n`);

    const datasetResults: any[] = [];
    let completed = 0;

    for (const strDelta of strengthSteps) {
        for (const attA of attASteps) {
            for (const defA of defASteps) {
                for (const attB of attBSteps) {
                    for (const defB of defBSteps) {

                        // Calcolo forza a somma costante 100 (A + B = 100)
                        const ratingA = Math.min(100, Math.max(0, BASE_STATS_VALUE + strDelta));
                        const ratingB = 100 - ratingA;

                        const teamA: TeamStats = {
                            midfield: ratingA,
                            playmaking: ratingA,
                            attack: ratingA,
                            defense: ratingA,
                            pressing: ratingA,
                            goalkeeper: ratingA,
                            cornerAttack: ratingA,
                            cornerDefense: ratingA
                        };

                        const teamB: TeamStats = {
                            midfield: ratingB,
                            playmaking: ratingB,
                            attack: ratingB,
                            defense: ratingB,
                            pressing: ratingB,
                            goalkeeper: ratingB,
                            cornerAttack: ratingB,
                            cornerDefense: ratingB
                        };

                        // Conversione parametri tattici da scala 0-100 a scala 0.0-1.0 per l'engine
                        const input: GameSequenceInput = {
                            teamA,
                            playstyleA: { verticality: attA / 100, defensiveLine: defA / 100 },
                            teamB,
                            playstyleB: { verticality: attB / 100, defensiveLine: defB / 100 },
                            startingPossession: 'A'
                        };

                        // Esecuzione N simulazioni via SimAzioneService.iterate
                        const rawResults = simAzioneService.iterate(
                            (p) => simGameService.simulateSequence(p, 20),
                            ITERATIONS_PER_SCENARIO,
                            input
                        );

                        const avgResult = aggregateScenarioResults(rawResults);

                        datasetResults.push({
                            coordinate: {
                                strengthRatio: strDelta,
                                attackA: attA,
                                defenseA: defA,
                                attackB: attB,
                                defenseB: defB
                            },
                            input,
                            avgResult
                        });

                        completed++;
                        if (completed % 100 === 0 || completed === totalScenarios) {
                            const pct = Math.round((completed / totalScenarios) * 100);
                            console.log(`Progresso: ${completed}/${totalScenarios} scenari calcolati (${pct}%)`);
                        }
                    }
                }
            }
        }
    }

    // Scrittura diretta dei file di output
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);

    // 1. JSON
    const jsonPath = path.join(outputDir, `sim_batch_dataset_${timestamp}.json`);
    const jsonPayload = {
        meta: {
            generatedAt: new Date().toISOString(),
            totalScenarios,
            iterationsPerScenario: ITERATIONS_PER_SCENARIO,
            ranges: RANGES
        },
        data: datasetResults
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf-8');

    // 2. CSV
    const csvPath = path.join(outputDir, `sim_batch_dataset_${timestamp}.csv`);
    const csvContent = buildCsvContent(datasetResults);
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n=== ESECUZIONE COMPLETATA IN ${durationSec}s ===`);
    console.log(`[JSON] Salvato in: ${jsonPath}`);
    console.log(`[CSV]  Salvato in: ${csvPath}`);
}

function buildCsvContent(results: any[]): string {
    const headers = [
        'StrengthRatio',
        'AttackA_Verticality',
        'DefenseA_DefensiveLine',
        'AttackB_Verticality',
        'DefenseB_DefensiveLine',

        'Seq_CountersCount',
        'Seq_CornersCount',
        'Seq_LooseBallsCount',

        'TeamA_Goals',
        'TeamA_TotalXG',
        'TeamA_XGPerShot',
        'TeamA_PossessionShare',
        'TeamA_ShotsTotal',
        'TeamA_ShotsOnTarget',
        'TeamA_ShotsBlocked',
        'TeamA_ShotsWoodwork',
        'TeamA_CornersWon',
        'TeamA_LooseBallsWon',
        'TeamA_PassesTotal',
        'TeamA_PassesOpenPlay',
        'TeamA_PassesCounterAttack',
        'TeamA_PassesCorner',
        'TeamA_PassesLooseBall',
        'TeamA_XGOpenPlay',
        'TeamA_XGCounterAttack',
        'TeamA_XGCorner',
        'TeamA_XGLooseBall',

        'TeamB_Goals',
        'TeamB_TotalXG',
        'TeamB_XGPerShot',
        'TeamB_PossessionShare',
        'TeamB_ShotsTotal',
        'TeamB_ShotsOnTarget',
        'TeamB_ShotsBlocked',
        'TeamB_ShotsWoodwork',
        'TeamB_CornersWon',
        'TeamB_LooseBallsWon',
        'TeamB_PassesTotal',
        'TeamB_PassesOpenPlay',
        'TeamB_PassesCounterAttack',
        'TeamB_PassesCorner',
        'TeamB_PassesLooseBall',
        'TeamB_XGOpenPlay',
        'TeamB_XGCounterAttack',
        'TeamB_XGCorner',
        'TeamB_XGLooseBall'
    ];

    const rows = results.map(item => {
        const c = item.coordinate;
        const seq = item.avgResult.sequenceDetails;
        const a = item.avgResult.statsA;
        const b = item.avgResult.statsB;

        return [
            c.strengthRatio,
            c.attackA,
            c.defenseA,
            c.attackB,
            c.defenseB,

            seq.counterAttacksCount,
            seq.cornersCount,
            seq.looseBallsCount,

            a.goals,
            a.totalXG,
            a.xgPerShot,
            a.possessionSharePercent,
            a.shots.total,
            a.shots.onTarget,
            a.shots.blocked,
            a.shots.woodwork,
            a.cornersWon,
            a.looseBallsWon,
            a.passesByState.total,
            a.passesByState.openPlay,
            a.passesByState.counterAttack,
            a.passesByState.corner,
            a.passesByState.looseBall,
            a.xgByState.openPlay,
            a.xgByState.counterAttack,
            a.xgByState.corner,
            a.xgByState.looseBall,

            b.goals,
            b.totalXG,
            b.xgPerShot,
            b.possessionSharePercent,
            b.shots.total,
            b.shots.onTarget,
            b.shots.blocked,
            b.shots.woodwork,
            b.cornersWon,
            b.looseBallsWon,
            b.passesByState.total,
            b.passesByState.openPlay,
            b.passesByState.counterAttack,
            b.passesByState.corner,
            b.passesByState.looseBall,
            b.xgByState.openPlay,
            b.xgByState.counterAttack,
            b.xgByState.corner,
            b.xgByState.looseBall
        ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
}

function aggregateScenarioResults(results: any[]): any {
    const count = results.length;
    let sumCounters = 0, sumCorners = 0, sumLoose = 0;

    const statsA = createZeroStats();
    const statsB = createZeroStats();

    for (const r of results) {
        sumCounters += r.sequenceDetails.counterAttacksCount;
        sumCorners += r.sequenceDetails.cornersCount;
        sumLoose += r.sequenceDetails.looseBallsCount;

        accumulateTeamStats(statsA, r.statsA);
        accumulateTeamStats(statsB, r.statsB);
    }

    return {
        totalActions: results[0].totalActions,
        sequenceDetails: {
            counterAttacksCount: Number((sumCounters / count).toFixed(2)),
            cornersCount: Number((sumCorners / count).toFixed(2)),
            looseBallsCount: Number((sumLoose / count).toFixed(2))
        },
        statsA: averageTeamStats(statsA, count),
        statsB: averageTeamStats(statsB, count)
    };
}

function createZeroStats(): any {
    return {
        goals: 0, totalXG: 0, xgPerShot: 0, possessionSharePercent: 0,
        xgByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0 },
        passesByState: { openPlay: 0, counterAttack: 0, corner: 0, looseBall: 0, total: 0 },
        shots: { total: 0, onTarget: 0, blocked: 0, woodwork: 0 },
        cornersWon: 0, looseBallsWon: 0
    };
}

function accumulateTeamStats(target: any, src: any): void {
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

function averageTeamStats(sum: any, N: number): any {
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

executeBatch();