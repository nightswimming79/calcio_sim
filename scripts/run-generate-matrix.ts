import * as fs from 'fs';
import * as path from 'path';

interface DatasetRow {
    StrengthRatio: number;
    AttackA_Verticality: number;
    DefenseA_DefensiveLine: number;
    AttackB_Verticality: number;
    DefenseB_DefensiveLine: number;

    TeamA_PossessionShare: number;
    TeamA_TotalXG: number;
    TeamB_TotalXG: number;
}

interface TierRange {
    tierName: string;
    possMin: number;
    possMax: number;
    xgAMin: number;
    xgAMax: number;
    xgBMin: number;
    xgBMax: number;
}

const TIERS: TierRange[] = [
    { tierName: 'Top Premier', possMin: 48, possMax: 52, xgAMin: 1.40, xgAMax: 1.80, xgBMin: 1.40, xgBMax: 1.80 },
    { tierName: 'Zona Champions', possMin: 55, possMax: 60, xgAMin: 1.80, xgAMax: 2.20, xgBMin: 1.10, xgBMax: 1.40 },
    { tierName: 'Media Premier', possMin: 61, possMax: 66, xgAMin: 2.10, xgAMax: 2.50, xgBMin: 0.80, xgBMax: 1.10 },
    { tierName: 'Bassa Premier', possMin: 66, possMax: 71, xgAMin: 2.50, xgAMax: 2.90, xgBMin: 0.55, xgBMax: 0.80 },
    { tierName: 'Championship', possMin: 71, possMax: 76, xgAMin: 2.90, xgAMax: 3.40, xgBMin: 0.35, xgBMax: 0.60 },
    { tierName: 'Categorie Inferiori', possMin: 76, possMax: 82, xgAMin: 3.40, xgAMax: 4.10, xgBMin: 0.15, xgBMax: 0.35 },
];

function getPossTier(val: number): string {
    const match = TIERS.find(t => val >= t.possMin && val <= t.possMax);
    return match ? match.tierName : '';
}

function getXgATier(val: number): string {
    const match = TIERS.find(t => val >= t.xgAMin && val <= t.xgAMax);
    return match ? match.tierName : '';
}

function getXgBTier(val: number): string {
    const match = TIERS.find(t => val >= t.xgBMin && val <= t.xgBMax);
    return match ? match.tierName : '';
}

function fmtVal(val: number, tierStr: string, isPoss: boolean = false): string {
    const formattedVal = isPoss ? val.toFixed(1) + '%' : val.toFixed(2);
    if (!tierStr) return formattedVal;
    return `${formattedVal} (${tierStr})`;
}

function generateMatrixCsv() {
    const outputDir = path.join(__dirname, '../output');
    const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('sim_batch_dataset_') && f.endsWith('.csv'))
        .sort()
        .reverse();

    if (files.length === 0) {
        throw new Error(`Nessun file CSV trovato in ${outputDir}`);
    }

    const filepath = path.join(outputDir, files[0]);
    const lines = fs.readFileSync(filepath, 'utf-8').trim().split('\n');
    const headers = lines[0].split(';');

    const rows: DatasetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(';').map(v => parseFloat(v.replace(',', '.')));
        const rowObj: any = {};
        headers.forEach((h, idx) => { rowObj[h.trim()] = values[idx]; });
        rows.push(rowObj as DatasetRow);
    }

    const ratios = Array.from(new Set(rows.map(r => r.StrengthRatio))).sort((a, b) => a - b);

    let csvContent = 'SR;possesso50;possesso Min;possesso Max;xga50;xga Min;xga Max;xgb50;xgb Min;xgb Max\n';

    ratios.forEach(sr => {
        const srRows = rows.filter(r => r.StrengthRatio === sr);

        // Riga neutra 50-50-50-50
        const r50 = srRows.find(r =>
            r.AttackA_Verticality === 50 &&
            r.DefenseA_DefensiveLine === 50 &&
            r.AttackB_Verticality === 50 &&
            r.DefenseB_DefensiveLine === 50
        );

        // Min e Max tra tutte le 81 configurazioni
        const possVals = srRows.map(r => r.TeamA_PossessionShare);
        const xgaVals = srRows.map(r => r.TeamA_TotalXG);
        const xgbVals = srRows.map(r => r.TeamB_TotalXG);

        const poss50Val = r50 ? r50.TeamA_PossessionShare : 0;
        const possMinVal = Math.min(...possVals);
        const possMaxVal = Math.max(...possVals);

        const xga50Val = r50 ? r50.TeamA_TotalXG : 0;
        const xgaMinVal = Math.min(...xgaVals);
        const xgaMaxVal = Math.max(...xgaVals);

        const xgb50Val = r50 ? r50.TeamB_TotalXG : 0;
        const xgbMinVal = Math.min(...xgbVals);
        const xgbMaxVal = Math.max(...xgbVals);

        const colPoss50 = fmtVal(poss50Val, getPossTier(poss50Val), true);
        const colPossMin = fmtVal(possMinVal, getPossTier(possMinVal), true);
        const colPossMax = fmtVal(possMaxVal, getPossTier(possMaxVal), true);

        const colXga50 = fmtVal(xga50Val, getXgATier(xga50Val));
        const colXgaMin = fmtVal(xgaMinVal, getXgATier(xgaMinVal));
        const colXgaMax = fmtVal(xgaMaxVal, getXgATier(xgaMaxVal));

        const colXgb50 = fmtVal(xgb50Val, getXgBTier(xgb50Val));
        const colXgbMin = fmtVal(xgbMinVal, getXgBTier(xgbMinVal));
        const colXgbMax = fmtVal(xgbMaxVal, getXgBTier(xgbMaxVal));

        csvContent += `${sr};${colPoss50};${colPossMin};${colPossMax};${colXga50};${colXgaMin};${colXgaMax};${colXgb50};${colXgbMin};${colXgbMax}\n`;
    });

    const outputPath = path.join(outputDir, 'strength_matrix_summary.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    console.log('=== CSV GENERATO CON SUCCESSO ===\n');
    console.log(`File salvato in: ${outputPath}\n`);
}

generateMatrixCsv();