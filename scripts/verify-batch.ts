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

    [key: string]: number; // Accesso dinamico alle colonne TeamA_ e TeamB_
}

// Configurazione dei range attesi sulla media a pari forza (StrengthRatio = 0)
const EXPECTED_RANGES: Record<string, { min: number; max: number }> = {
    Goals: { min: 1.0, max: 2.2 },
    TotalXG: { min: 1.0, max: 2.2 },
    XGPerShot: { min: 0.14, max: 0.18 },
    PossessionShare: { min: 48.0, max: 52.0 },
    ShotsTotal: { min: 7.0, max: 13.0 },
    ShotsOnTarget: { min: 3.0, max: 7.0 },
    ShotsBlocked: { min: 1.5, max: 4.0 },
    ShotsWoodwork: { min: 0.2, max: 0.8 },
    CornersWon: { min: 1.0, max: 2.5 },
    LooseBallsWon: { min: 3.0, max: 6.0 },
    PassesTotal: { min: 120.0, max: 165.0 },
    PassesOpenPlay: { min: 80.0, max: 160.0 },
    PassesCounterAttack: { min: 10.0, max: 18.0 },
    PassesCorner: { min: 2.0, max: 5.0 },
    PassesLooseBall: { min: 6.0, max: 12.0 },
    XGOpenPlay: { min: 0.5, max: 1.2 },
    XGCounterAttack: { min: 0.3, max: 0.7 },
    XGCorner: { min: 0.08, max: 0.25 },
    XGLooseBall: { min: 0.1, max: 0.3 }
};

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
    const lines = content.trim().split('\n');
    const headers = lines[0].split(';');

    const rows: DatasetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(';').map(v => parseFloat(v.replace(',', '.')));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
            rowObj[h.trim()] = values[idx];
        });
        rows.push(rowObj as DatasetRow);
    }

    return { filepath, rows };
}

function runColumnVerification() {
    const outputDir = path.join(__dirname, '../output');
    console.log('=== VERIFICA ANALITICA COLONNA PER COLONNA ===\n');

    const { filepath, rows } = loadLatestCsv(outputDir);
    console.log(`File caricato: ${path.basename(filepath)}`);

    // Filtriamo per StrengthRatio = 0
    const rowsSR0 = rows.filter(r => r.StrengthRatio === 0);
    console.log(`Analisi su ${rowsSR0.length} scenari a StrengthRatio = 0\n`);

    const metrics = Object.keys(EXPECTED_RANGES);

    let reportText = `REPORT VALIDAZIONE DETTAGLIATA COLONNE (StrengthRatio = 0)\n`;
    reportText += `File sorgente: ${path.basename(filepath)}\n`;
    reportText += `Data verifica: ${new Date().toISOString()}\n\n`;

    const headerLine =
        pad('METRICA', 20) + ' | ' +
        pad('MEDIA A', 8) + ' | ' +
        pad('MEDIA B', 8) + ' | ' +
        pad('RANGE ATT (0->100)', 20) + ' | ' +
        pad('RANGE DIF (0->100)', 20) + ' | ' +
        pad('SIMM', 5) + ' | ' +
        pad('MONOT', 5) + ' | ' +
        'ESITO';

    const separator = '-'.repeat(headerLine.length);

    console.log(separator);
    console.log(headerLine);
    console.log(separator);

    reportText += separator + '\n' + headerLine + '\n' + separator + '\n';

    let totalOK = 0;
    let totalKO = 0;

    metrics.forEach(m => {
        const colA = `TeamA_${m}`;
        const colB = `TeamB_${m}`;

        // 1. Media A e B
        const meanA = rowsSR0.reduce((s, r) => s + (r[colA] ?? 0), 0) / rowsSR0.length;
        const meanB = rowsSR0.reduce((s, r) => s + (r[colB] ?? 0), 0) / rowsSR0.length;

        // 2. Test Simmetria
        const symmDiff = Math.abs(meanA - meanB);
        const okSymm = symmDiff <= 0.05;

        // 3. Test Range Globale
        const range = EXPECTED_RANGES[m];
        const okRange = meanA >= range.min && meanA <= range.max && meanB >= range.min && meanB <= range.max;

        // 4. RANGE ATTACCO (al variare di AttackA_Verticality: 0 -> 50 -> 100)
        const att0 = rowsSR0.filter(r => r.AttackA_Verticality === 0);
        const att50 = rowsSR0.filter(r => r.AttackA_Verticality === 50);
        const att100 = rowsSR0.filter(r => r.AttackA_Verticality === 100);

        const va0 = att0.reduce((s, r) => s + r[colA], 0) / att0.length;
        const va50 = att50.reduce((s, r) => s + r[colA], 0) / att50.length;
        const va100 = att100.reduce((s, r) => s + r[colA], 0) / att100.length;

        const minAtt = Math.min(va0, va100);
        const maxAtt = Math.max(va0, va100);
        const attRangeStr = `${minAtt.toFixed(2)} -> ${maxAtt.toFixed(2)}`;

        // Monotonicità Attacco
        const isAttIncreasing = va0 <= va50 + 1e-5 && va50 <= va100 + 1e-5;
        const isAttDecreasing = va0 >= va50 - 1e-5 && va50 >= va100 - 1e-5;
        const okMonotonicAtt = isAttIncreasing || isAttDecreasing;

        // 5. RANGE DIFESA (al variare di DefenseA_DefensiveLine: 0 -> 50 -> 100)
        const def0 = rowsSR0.filter(r => r.DefenseA_DefensiveLine === 0);
        const def50 = rowsSR0.filter(r => r.DefenseA_DefensiveLine === 50);
        const def100 = rowsSR0.filter(r => r.DefenseA_DefensiveLine === 100);

        const da0 = def0.reduce((s, r) => s + r[colA], 0) / def0.length;
        const da50 = def50.reduce((s, r) => s + r[colA], 0) / def50.length;
        const da100 = def100.reduce((s, r) => s + r[colA], 0) / def100.length;

        const minDef = Math.min(da0, da100);
        const maxDef = Math.max(da0, da100);
        const defRangeStr = `${minDef.toFixed(2)} -> ${maxDef.toFixed(2)}`;

        // Monotonicità Difesa
        const isDefIncreasing = da0 <= da50 + 1e-5 && da50 <= da100 + 1e-5;
        const isDefDecreasing = da0 >= da50 - 1e-5 && da50 >= da100 - 1e-5;
        const okMonotonicDef = isDefIncreasing || isDefDecreasing;

        // Esito globale
        const globalPass = okSymm && okRange && okMonotonicAtt && okMonotonicDef;

        if (globalPass) totalOK++;
        else totalKO++;

        const rowLine =
            pad(m, 20) + ' | ' +
            pad(meanA.toFixed(2), 8) + ' | ' +
            pad(meanB.toFixed(2), 8) + ' | ' +
            pad(attRangeStr, 20) + ' | ' +
            pad(defRangeStr, 20) + ' | ' +
            pad(okSymm ? 'OK' : 'KO', 5) + ' | ' +
            pad(okMonotonicAtt && okMonotonicDef ? 'OK' : 'KO', 5) + ' | ' +
            (globalPass ? '[ OK ]' : '[ KO ]');

        console.log(rowLine);
        reportText += rowLine + '\n';
    });

    console.log(separator);
    const summaryLine = `ESITO FINALE: ${totalOK}/${metrics.length} metriche superate. (${totalKO} KO)`;
    console.log(summaryLine);
    console.log(separator + '\n');

    reportText += separator + '\n' + summaryLine + '\n' + separator + '\n';

    // Scrittura del file di report di output
    const reportPath = path.join(outputDir, 'batch_column_validation_report.txt');
    fs.writeFileSync(reportPath, reportText, 'utf-8');
    console.log(`[FILE PRODOTTO] Report salvato con successo in:\n${reportPath}\n`);
}

function pad(str: string, len: number): string {
    return str.padEnd(len, ' ');
}

runColumnVerification();