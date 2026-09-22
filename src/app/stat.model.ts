// Tipi per la risposta delle statistiche
export interface StatisticaTesto {
    conteggio: Record<string, number>; // { "GOL": 15, "PARATA": 30, ... }
    percentuale: Record<string, string>; // { "GOL": "15.00%", "PARATA": "30.00%", ... }
}

export interface StatisticaNumero {
    min: number;
    max: number;
    media: number;
    tot: number;
}


export interface StatisticaBoolean {
    trueCount: number;
    falseCount: number;
    truePercentuale: string;
    falsePercentuale: string;
}

export interface RisultatoAnalisi {
    testi: Record<string, StatisticaTesto>;
    numeri: Record<string, StatisticaNumero>;
    booleani: Record<string, StatisticaBoolean>;
    totaleElementi: number;
}