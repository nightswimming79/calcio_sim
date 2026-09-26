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

// Definiamo le 6 forchette di riferimento
const TIERS: TierRange[] = [
    { tierName: 'Top Premier vs Top Premier', possMin: 48, possMax: 52, xgAMin: 1.40, xgAMax: 1.80, xgBMin: 1.40, xgBMax: 1.80 },
    { tierName: 'Top Premier vs Zona Champions', possMin: 55, possMax: 60, xgAMin: 1.80, xgAMax: 2.20, xgBMin: 1.10, xgBMax: 1.40 },
    { tierName: 'Top Premier vs Media Premier', possMin: 61, possMax: 66, xgAMin: 2.10, xgAMax: 2.50, xgBMin: 0.80, xgBMax: 1.10 },
    { tierName: 'Top Premier vs Bassa Premier', possMin: 66, possMax: 71, xgAMin: 2.50, xgAMax: 2.90, xgBMin: 0.55, xgBMax: 0.80 },
    { tierName: 'Top Premier vs Championship', possMin: 71, possMax: 76, xgAMin: 2.90, xgAMax: 3.40, xgBMin: 0.35, xgBMax: 0.60 },
    { tierName: 'Top Premier vs Categorie Inferiori', possMin: 76, possMax: 82, xgAMin: 3.40, xgAMax: 4.10, xgBMin: 0.15, xgBMax: 0.35 },
];

function findPossessionTier(val: number): string {
    const match = TIERS.find(t => val >= t.possMin && val <= t.possMax);
    return match ? match.tierName : 'fuori scala';
}

function findXgATier(val: number): string {
    const match = TIERS.find(t => val >= t.xgAMin && val <= t.xgAMax);
    return match ? match.tierName : 'fuori scala';
}

function findXgBTier(val: number): string {
    const match = TIERS.find(t => val >= t.xgBMin && val <= t.xgBMax);
    return match ? match.tierName : 'fuori scala';
}

function runStrengthMapping() {
    const outputDir = path.join(__dirname, '../output');
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
        headers.forEach((h, idx) => { rowObj[h.trim()] = values[idx]; });
        rows.push(rowObj as DatasetRow);
    }

    // Prende le sole righe a tattica neutra 50-50-50-50
    const neutralRows = rows.filter(r =>
        r.AttackA_Verticality === 50 &&
        r.DefenseA_DefensiveLine === 50 &&
        r.AttackB_Verticality === 50 &&
        r.DefenseB_DefensiveLine === 50
    ).sort((a, b) => a.StrengthRatio - b.StrengthRatio);

    let outputTxt = '';

    neutralRows.forEach(row => {
        const sr = row.StrengthRatio;
        const possVal = row.TeamA_PossessionShare;
        const xgAVal = row.TeamA_TotalXG;
        const xgBVal = row.TeamB_TotalXG;

        const possTier = findPossessionTier(possVal);
        const xgATier = findXgATier(xgAVal);
        const xgBTier = findXgBTier(xgBVal);

        const line = `StrengthRatio = ${sr}: possesso nella forchetta di ${possTier} (${possVal.toFixed(1)}%), xGA nella forchetta di ${xgATier} (${xgAVal.toFixed(2)}), xGB nella forchetta di ${xgBTier} (${xgBVal.toFixed(2)})`;

        outputTxt += line + '\n';
    });

    const reportPath = path.join(outputDir, 'strength_validation_report.txt');
    fs.writeFileSync(reportPath, outputTxt, 'utf-8');

    console.log('=== REPORT GENERATO ===\n');
    console.log(outputTxt);
    console.log(`Saved in: ${reportPath}`);
}

runStrengthMapping();