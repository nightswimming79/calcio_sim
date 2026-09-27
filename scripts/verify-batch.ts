import * as fs from 'fs';
import * as path from 'path';

interface DatasetRow {
    StrengthRatio: number;
    AttackA_Verticality: number;
    DefenseA_DefensiveLine: number;
    AttackB_Verticality: number;
    DefenseB_DefensiveLine: number;

    Seq_CountersCount: number;
    Seq_CornersCount: number;
    Seq_LooseBallsCount: number;

    [key: string]: number;
}

interface RangeTarget {
    min: number;
    max: number;
}

interface DualRangeTarget {
    teamA: RangeTarget;
    teamB: RangeTarget;
}

interface BenchmarkConfig {
    StrengthRatio: number;
    metrics: Record<string, DualRangeTarget>;
}

const EXPECTED_RANGES: BenchmarkConfig[] = [
    {
        // 1. DUE TOP CLUB (PARI FORZA)
        StrengthRatio: 0,
        metrics: {
            Goals: { teamA: { min: 1.0, max: 2.2 }, teamB: { min: 1.0, max: 2.2 } },
            TotalXG: { teamA: { min: 1.0, max: 2.2 }, teamB: { min: 1.0, max: 2.2 } },
            XGPerShot: { teamA: { min: 0.14, max: 0.17 }, teamB: { min: 0.14, max: 0.17 } },
            PossessionShare: { teamA: { min: 48.0, max: 52.0 }, teamB: { min: 48.0, max: 52.0 } },
            ShotsTotal: { teamA: { min: 7.0, max: 13.0 }, teamB: { min: 7.0, max: 13.0 } },
            ShotsOnTarget: { teamA: { min: 3.0, max: 7.0 }, teamB: { min: 3.0, max: 7.0 } },
            ShotsBlocked: { teamA: { min: 1.5, max: 4.0 }, teamB: { min: 1.5, max: 4.0 } },
            ShotsWoodwork: { teamA: { min: 0.2, max: 0.8 }, teamB: { min: 0.2, max: 0.8 } },
            CornersWon: { teamA: { min: 1.0, max: 2.5 }, teamB: { min: 1.0, max: 2.5 } },
            LooseBallsWon: { teamA: { min: 3.0, max: 6.0 }, teamB: { min: 3.0, max: 6.0 } },
            PassesTotal: { teamA: { min: 120.0, max: 165.0 }, teamB: { min: 120.0, max: 165.0 } },
            PassesOpenPlay: { teamA: { min: 80.0, max: 130.0 }, teamB: { min: 80.0, max: 130.0 } },
            PassesCounterAttack: { teamA: { min: 10.0, max: 18.0 }, teamB: { min: 10.0, max: 18.0 } },
            PassesCorner: { teamA: { min: 2.0, max: 5.0 }, teamB: { min: 2.0, max: 5.0 } },
            PassesLooseBall: { teamA: { min: 6.0, max: 12.0 }, teamB: { min: 6.0, max: 12.0 } },
            XGOpenPlay: { teamA: { min: 0.52, max: 1.05 }, teamB: { min: 0.52, max: 1.05 } },
            XGCounterAttack: { teamA: { min: 0.30, max: 0.65 }, teamB: { min: 0.30, max: 0.65 } },
            XGCorner: { teamA: { min: 0.08, max: 0.22 }, teamB: { min: 0.08, max: 0.22 } },
            XGLooseBall: { teamA: { min: 0.10, max: 0.28 }, teamB: { min: 0.10, max: 0.28 } }
        }
    },

    // 2. TOP CLUB VS CONTENDER CHAMPIONS (SR = 5)
    {
        StrengthRatio: 5,
        metrics: {
            Goals: { teamA: { min: 1.4, max: 2.7 }, teamB: { min: 0.6, max: 1.6 } },
            TotalXG: { teamA: { min: 1.4, max: 2.7 }, teamB: { min: 0.6, max: 1.5 } },
            XGPerShot: { teamA: { min: 0.13, max: 0.17 }, teamB: { min: 0.09, max: 0.14 } },
            PossessionShare: { teamA: { min: 54.0, max: 59.0 }, teamB: { min: 41.0, max: 46.0 } },
            ShotsTotal: { teamA: { min: 9.5, max: 17.0 }, teamB: { min: 6.5, max: 12.0 } },
            ShotsOnTarget: { teamA: { min: 4.5, max: 8.6 }, teamB: { min: 2.8, max: 5.8 } },
            ShotsBlocked: { teamA: { min: 2.8, max: 5.1 }, teamB: { min: 1.8, max: 3.8 } },
            ShotsWoodwork: { teamA: { min: 0.4, max: 0.9 }, teamB: { min: 0.2, max: 0.65 } },
            CornersWon: { teamA: { min: 1.5, max: 2.9 }, teamB: { min: 1.0, max: 2.4 } },
            LooseBallsWon: { teamA: { min: 4.3, max: 6.8 }, teamB: { min: 3.8, max: 6.4 } },
            PassesTotal: { teamA: { min: 132.0, max: 208.0 }, teamB: { min: 100.0, max: 155.0 } },
            PassesOpenPlay: { teamA: { min: 90.0, max: 160.0 }, teamB: { min: 78.0, max: 122.0 } },
            PassesCounterAttack: { teamA: { min: 20.0, max: 26.0 }, teamB: { min: 8.0, max: 16.0 } },
            PassesCorner: { teamA: { min: 3.0, max: 5.6 }, teamB: { min: 2.0, max: 4.5 } },
            PassesLooseBall: { teamA: { min: 8.5, max: 13.5 }, teamB: { min: 8.0, max: 12.5 } },
            XGOpenPlay: { teamA: { min: 0.51, max: 1.45 }, teamB: { min: 0.27, max: 0.77 } },
            XGCounterAttack: { teamA: { min: 0.65, max: 0.78 }, teamB: { min: 0.20, max: 0.40 } },
            XGCorner: { teamA: { min: 0.10, max: 0.20 }, teamB: { min: 0.05, max: 0.15 } },
            XGLooseBall: { teamA: { min: 0.14, max: 0.27 }, teamB: { min: 0.08, max: 0.18 } }
        }
    },

    // 3. TOP CLUB VS MEDIA CLASSIFICA (SR = 9)
    {
        StrengthRatio: 9,
        metrics: {
            Goals: { teamA: { min: 1.8, max: 3.3 }, teamB: { min: 0.3, max: 1.2 } },
            TotalXG: { teamA: { min: 1.8, max: 3.2 }, teamB: { min: 0.4, max: 1.1 } },
            XGPerShot: { teamA: { min: 0.14, max: 0.18 }, teamB: { min: 0.08, max: 0.13 } },
            PossessionShare: { teamA: { min: 60.0, max: 65.0 }, teamB: { min: 35.0, max: 40.0 } },
            ShotsTotal: { teamA: { min: 12.0, max: 19.5 }, teamB: { min: 4.5, max: 9.0 } },
            ShotsOnTarget: { teamA: { min: 5.5, max: 9.8 }, teamB: { min: 1.8, max: 4.5 } },
            ShotsBlocked: { teamA: { min: 3.2, max: 5.6 }, teamB: { min: 1.2, max: 3.2 } },
            ShotsWoodwork: { teamA: { min: 0.5, max: 1.0 }, teamB: { min: 0.15, max: 0.5 } },
            CornersWon: { teamA: { min: 1.8, max: 3.2 }, teamB: { min: 0.8, max: 2.2 } },
            LooseBallsWon: { teamA: { min: 4.4, max: 7.0 }, teamB: { min: 3.5, max: 6.2 } },
            PassesTotal: { teamA: { min: 145.0, max: 225.0 }, teamB: { min: 80.0, max: 130.0 } },
            PassesOpenPlay: { teamA: { min: 98.0, max: 170.0 }, teamB: { min: 65.0, max: 101.0 } },
            PassesCounterAttack: { teamA: { min: 25.0, max: 32.0 }, teamB: { min: 5.0, max: 12.0 } },
            PassesCorner: { teamA: { min: 3.5, max: 6.2 }, teamB: { min: 1.5, max: 3.8 } },
            PassesLooseBall: { teamA: { min: 8.8, max: 14.0 }, teamB: { min: 7.0, max: 12.0 } },
            XGOpenPlay: { teamA: { min: 0.76, max: 1.72 }, teamB: { min: 0.20, max: 0.50 } },
            XGCounterAttack: { teamA: { min: 0.75, max: 0.93 }, teamB: { min: 0.12, max: 0.32 } },
            XGCorner: { teamA: { min: 0.12, max: 0.23 }, teamB: { min: 0.03, max: 0.12 } },
            XGLooseBall: { teamA: { min: 0.17, max: 0.32 }, teamB: { min: 0.05, max: 0.16 } }
        }
    },

    // 4. TOP CLUB VS BASSA CLASSIFICA (SR = 13)
    {
        StrengthRatio: 13,
        metrics: {
            Goals: { teamA: { min: 2.2, max: 3.8 }, teamB: { min: 0.2, max: 1.0 } },
            TotalXG: { teamA: { min: 2.2, max: 3.6 }, teamB: { min: 0.2, max: 0.9 } },
            XGPerShot: { teamA: { min: 0.15, max: 0.18 }, teamB: { min: 0.07, max: 0.12 } },
            PossessionShare: { teamA: { min: 65.0, max: 70.0 }, teamB: { min: 30.0, max: 35.0 } },
            ShotsTotal: { teamA: { min: 14.0, max: 22.0 }, teamB: { min: 3.0, max: 7.5 } },
            ShotsOnTarget: { teamA: { min: 6.8, max: 11.2 }, teamB: { min: 1.0, max: 3.5 } },
            ShotsBlocked: { teamA: { min: 3.8, max: 6.5 }, teamB: { min: 0.8, max: 2.5 } },
            ShotsWoodwork: { teamA: { min: 0.6, max: 1.2 }, teamB: { min: 0.05, max: 0.4 } },
            CornersWon: { teamA: { min: 2.2, max: 3.8 }, teamB: { min: 0.5, max: 1.8 } },
            LooseBallsWon: { teamA: { min: 4.8, max: 7.5 }, teamB: { min: 3.0, max: 5.8 } },
            PassesTotal: { teamA: { min: 160.0, max: 245.0 }, teamB: { min: 65.0, max: 115.0 } },
            PassesOpenPlay: { teamA: { min: 110.0, max: 180.0 }, teamB: { min: 50.0, max: 90.0 } },
            PassesCounterAttack: { teamA: { min: 28.0, max: 36.0 }, teamB: { min: 3.5, max: 9.5 } },
            PassesCorner: { teamA: { min: 4.0, max: 7.2 }, teamB: { min: 1.0, max: 3.0 } },
            PassesLooseBall: { teamA: { min: 9.5, max: 15.0 }, teamB: { min: 6.0, max: 11.0 } },
            XGOpenPlay: { teamA: { min: 0.90, max: 1.90 }, teamB: { min: 0.07, max: 0.40 } },
            XGCounterAttack: { teamA: { min: 0.85, max: 1.05 }, teamB: { min: 0.08, max: 0.25 } },
            XGCorner: { teamA: { min: 0.15, max: 0.27 }, teamB: { min: 0.02, max: 0.11 } },
            XGLooseBall: { teamA: { min: 0.30, max: 0.38 }, teamB: { min: 0.03, max: 0.14 } }
        }
    },

    // 5. TOP CLUB VS CHAMPIONSHIP (SR = 16)
    {
        StrengthRatio: 16,
        metrics: {
            Goals: { teamA: { min: 2.6, max: 4.4 }, teamB: { min: 0.1, max: 0.8 } },
            TotalXG: { teamA: { min: 2.6, max: 4.2 }, teamB: { min: 0.15, max: 0.75 } },
            XGPerShot: { teamA: { min: 0.15, max: 0.19 }, teamB: { min: 0.06, max: 0.11 } },
            PossessionShare: { teamA: { min: 70.0, max: 75.0 }, teamB: { min: 25.0, max: 30.0 } },
            ShotsTotal: { teamA: { min: 16.0, max: 24.5 }, teamB: { min: 2.5, max: 6.0 } },
            ShotsOnTarget: { teamA: { min: 8.0, max: 12.8 }, teamB: { min: 0.8, max: 2.8 } },
            ShotsBlocked: { teamA: { min: 4.2, max: 7.2 }, teamB: { min: 0.5, max: 2.0 } },
            ShotsWoodwork: { teamA: { min: 0.7, max: 1.4 }, teamB: { min: 0.02, max: 0.3 } },
            CornersWon: { teamA: { min: 2.5, max: 4.2 }, teamB: { min: 0.3, max: 1.4 } },
            LooseBallsWon: { teamA: { min: 5.0, max: 7.8 }, teamB: { min: 2.5, max: 5.2 } },
            PassesTotal: { teamA: { min: 175.0, max: 260.0 }, teamB: { min: 45.0, max: 85.0 } },
            PassesOpenPlay: { teamA: { min: 120.0, max: 190.0 }, teamB: { min: 35.0, max: 64.0 } },
            PassesCounterAttack: { teamA: { min: 30.0, max: 39.0 }, teamB: { min: 2.5, max: 7.5 } },
            PassesCorner: { teamA: { min: 4.5, max: 8.0 }, teamB: { min: 0.6, max: 2.4 } },
            PassesLooseBall: { teamA: { min: 10.0, max: 15.8 }, teamB: { min: 5.0, max: 9.8 } },
            XGOpenPlay: { teamA: { min: 1.21, max: 2.30 }, teamB: { min: 0.07, max: 0.33 } },
            XGCounterAttack: { teamA: { min: 0.92, max: 1.20 }, teamB: { min: 0.05, max: 0.22 } },
            XGCorner: { teamA: { min: 0.17, max: 0.30 }, teamB: { min: 0.01, max: 0.08 } },
            XGLooseBall: { teamA: { min: 0.30, max: 0.40 }, teamB: { min: 0.02, max: 0.12 } }
        }
    },

    // 6. TOP CLUB VS CATEGORIE INFERIORI (SR = 20)
    {
        StrengthRatio: 20,
        metrics: {
            Goals: { teamA: { min: 3.0, max: 5.0 }, teamB: { min: 0.0, max: 0.6 } },
            TotalXG: { teamA: { min: 3.0, max: 4.8 }, teamB: { min: 0.1, max: 0.55 } },
            XGPerShot: { teamA: { min: 0.16, max: 0.20 }, teamB: { min: 0.05, max: 0.115 } },
            PossessionShare: { teamA: { min: 76.0, max: 82.0 }, teamB: { min: 18.0, max: 24.0 } },
            ShotsTotal: { teamA: { min: 18.0, max: 27.0 }, teamB: { min: 1.5, max: 4.8 } },
            ShotsOnTarget: { teamA: { min: 9.0, max: 14.5 }, teamB: { min: 0.5, max: 2.0 } },
            ShotsBlocked: { teamA: { min: 4.8, max: 8.0 }, teamB: { min: 0.3, max: 1.5 } },
            ShotsWoodwork: { teamA: { min: 0.8, max: 1.6 }, teamB: { min: 0.0, max: 0.2 } },
            CornersWon: { teamA: { min: 2.8, max: 4.8 }, teamB: { min: 0.1, max: 1.0 } },
            LooseBallsWon: { teamA: { min: 5.2, max: 8.2 }, teamB: { min: 2.0, max: 4.6 } },
            PassesTotal: { teamA: { min: 190.0, max: 280.0 }, teamB: { min: 30.0, max: 60.0 } },
            PassesOpenPlay: { teamA: { min: 135.0, max: 205.0 }, teamB: { min: 22.0, max: 43.0 } },
            PassesCounterAttack: { teamA: { min: 32.0, max: 42.0 }, teamB: { min: 1.5, max: 5.5 } },
            PassesCorner: { teamA: { min: 5.0, max: 9.0 }, teamB: { min: 0.2, max: 1.8 } },
            PassesLooseBall: { teamA: { min: 10.5, max: 16.5 }, teamB: { min: 4.0, max: 8.5 } },
            XGOpenPlay: { teamA: { min: 1.45, max: 2.65 }, teamB: { min: 0.05, max: 0.25 } },
            XGCounterAttack: { teamA: { min: 1.00, max: 1.30 }, teamB: { min: 0.02, max: 0.16 } },
            XGCorner: { teamA: { min: 0.20, max: 0.36 }, teamB: { min: 0.00, max: 0.06 } },
            XGLooseBall: { teamA: { min: 0.35, max: 0.49 }, teamB: { min: 0.01, max: 0.08 } }
        }
    }
];

function loadLatestCsv(outputDir: string): { filepath: string; rows: DatasetRow[] } {
    if (!fs.existsSync(outputDir)) {
        throw new Error(`La cartella ${outputDir} non esiste.`);
    }

    const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('sim_batch_dataset_') && f.endsWith('.csv'))
        .sort()
        .reverse();

    if (files.length === 0) {
        throw new Error(`Nessun file CSV trovato nella cartella ${outputDir}`);
    }

    const filepath = path.join(outputDir, files[0]);
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.trim().split(/\r?\n/);
    const headers = lines[0].split(';').map(h => h.trim());

    const rows: DatasetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(';').map(v => parseFloat(v.replace(',', '.')));
        const rowObj: Record<string, number> = {};
        headers.forEach((h, idx) => {
            rowObj[h] = values[idx];
        });
        rows.push(rowObj as DatasetRow);
    }

    return { filepath, rows };
}

function safeMean(rows: DatasetRow[], colKey: string): number {
    if (rows.length === 0) return 0;
    return rows.reduce((s, r) => s + (r[colKey] ?? 0), 0) / rows.length;
}

function pad(str: string, len: number): string {
    return str.padEnd(len, ' ');
}

function runColumnVerification(
    benchmark: BenchmarkConfig,
    filepath: string,
    rows: DatasetRow[]
): string {
    const targetSR = benchmark.StrengthRatio;
    const rowsFiltered = rows.filter(r => r.StrengthRatio === targetSR);

    let chunkReport = `=== VERIFICA ANALITICA COLONNA PER COLONNA (StrengthRatio = ${targetSR}) ===\n`;
    chunkReport += `File sorgente: ${path.basename(filepath)}\n`;
    chunkReport += `Scenari analizzati: ${rowsFiltered.length}\n`;
    chunkReport += `Data verifica: ${new Date().toISOString()}\n\n`;

    const headerLine =
        pad('METRICA', 20) + ' | ' +
        pad('MEDIA A', 8) + ' | ' +
        pad('RANGE ATT (A)', 14) + ' | ' +
        pad('MEDIA B', 8) + ' | ' +
        pad('RANGE ATT (B)', 14) + ' | ' +
        pad('VAR ATT (0->100)', 18) + ' | ' +
        pad('VAR DIF (0->100)', 18) + ' | ' +
        pad('SIMM', 5) + ' | ' +
        pad('RNG A', 5) + ' | ' +
        pad('RNG B', 5) + ' | ' +
        pad('MONOT', 5) + ' | ' +
        'ESITO';

    const separator = '-'.repeat(headerLine.length);
    chunkReport += separator + '\n' + headerLine + '\n' + separator + '\n';

    const metrics = Object.keys(benchmark.metrics);

    let totalOK = 0;
    let totalKO = 0;

    metrics.forEach(m => {
        const colA = `TeamA_${m}`;
        const colB = `TeamB_${m}`;

        const meanA = safeMean(rowsFiltered, colA);
        const meanB = safeMean(rowsFiltered, colB);

        const range = benchmark.metrics[m];

        // 1. Test Simmetria (Valido a pari forza SR = 0)
        const symmDiff = Math.abs(meanA - meanB);
        const maxMean = Math.max(Math.abs(meanA), Math.abs(meanB));
        const okSymm = targetSR === 0 ? (maxMean === 0 ? true : (symmDiff / maxMean) <= 0.05) : true;

        // 2. Test Range Globale
        const okRangeA = meanA >= range.teamA.min && meanA <= range.teamA.max;
        const okRangeB = meanB >= range.teamB.min && meanB <= range.teamB.max;

        // Visualizzazione dinamica range: mostrati SOLO se KO
        const rangeAStr = `[${range.teamA.min} - ${range.teamA.max}]`;
        const rangeBStr = `[${range.teamB.min} - ${range.teamB.max}]`;

        // 3. Monotonicità Attacco Team A (0 -> 50 -> 100)
        const att0 = rowsFiltered.filter(r => r.AttackA_Verticality === 0);
        const att50 = rowsFiltered.filter(r => r.AttackA_Verticality === 50);
        const att100 = rowsFiltered.filter(r => r.AttackA_Verticality === 100);

        const va0 = safeMean(att0, colA);
        const va50 = safeMean(att50, colA);
        const va100 = safeMean(att100, colA);

        const minAtt = Math.min(va0, va100);
        const maxAtt = Math.max(va0, va100);
        const attRangeStr = `${minAtt.toFixed(2)} -> ${maxAtt.toFixed(2)}`;

        const isAttIncreasing = va0 <= va50 + 1e-5 && va50 <= va100 + 1e-5;
        const isAttDecreasing = va0 >= va50 - 1e-5 && va50 >= va100 - 1e-5;
        const okMonotonicAtt = isAttIncreasing || isAttDecreasing;

        // 4. Monotonicità Difesa Team A (0 -> 50 -> 100)
        const def0 = rowsFiltered.filter(r => r.DefenseA_DefensiveLine === 0);
        const def50 = rowsFiltered.filter(r => r.DefenseA_DefensiveLine === 50);
        const def100 = rowsFiltered.filter(r => r.DefenseA_DefensiveLine === 100);

        const da0 = safeMean(def0, colA);
        const da50 = safeMean(def50, colA);
        const da100 = safeMean(def100, colA);

        const minDef = Math.min(da0, da100);
        const maxDef = Math.max(da0, da100);
        const defRangeStr = `${minDef.toFixed(2)} -> ${maxDef.toFixed(2)}`;

        const isDefIncreasing = da0 <= da50 + 1e-5 && da50 <= da100 + 1e-5;
        const isDefDecreasing = da0 >= da50 - 1e-5 && da50 >= da100 - 1e-5;
        const okMonotonicDef = isDefIncreasing || isDefDecreasing;

        // Esito globale
        const okMonotonic = okMonotonicAtt && okMonotonicDef;
        const globalPass = okSymm && okRangeA && okRangeB && okMonotonic;

        if (globalPass) totalOK++;
        else totalKO++;

        // Regole di formattazione:
        // - OK -> '--'
        // - KO -> 'KO'
        const strSymm = okSymm ? '--' : 'KO';
        const strRangeA = okRangeA ? '--' : 'KO';
        const strRangeB = okRangeB ? '--' : 'KO';
        const strMonot = okMonotonic ? '--' : 'KO';
        const strEsito = globalPass ? '[ -- ]' : '[ KO ]';

        const rowLine =
            pad(m, 20) + ' | ' +
            pad(meanA.toFixed(2), 8) + ' | ' +
            pad(rangeAStr, 14) + ' | ' +
            pad(meanB.toFixed(2), 8) + ' | ' +
            pad(rangeBStr, 14) + ' | ' +
            pad(attRangeStr, 18) + ' | ' +
            pad(defRangeStr, 18) + ' | ' +
            pad(strSymm, 5) + ' | ' +
            pad(strRangeA, 5) + ' | ' +
            pad(strRangeB, 5) + ' | ' +
            pad(strMonot, 5) + ' | ' +
            strEsito;

        chunkReport += rowLine + '\n';
    });

    const summaryLine = `ESITO STAGE (StrengthRatio = ${targetSR}): ${totalOK}/${metrics.length} metriche superate. (${totalKO} KO)`;
    chunkReport += separator + '\n' + summaryLine + '\n' + separator + '\n\n';

    return chunkReport;
}

function main() {
    const outputDir = path.join(__dirname, '../output');

    try {
        const { filepath, rows } = loadLatestCsv(outputDir);
        console.log(`Caricato file: ${path.basename(filepath)} (${rows.length} righe totali)\n`);

        let fullReport = '';

        for (const bench of EXPECTED_RANGES) {
            const reportChunk = runColumnVerification(bench, filepath, rows);
            console.log(reportChunk);
            fullReport += reportChunk;
        }

        const reportPath = path.join(outputDir, 'batch_column_validation_report.txt');
        fs.writeFileSync(reportPath, fullReport, 'utf-8');
        console.log(`[FILE PRODOTTO] Report completo salvato in:\n${reportPath}`);
    } catch (error) {
        console.error('Errore durante l\'esecuzione del report:', error);
    }
}

main();