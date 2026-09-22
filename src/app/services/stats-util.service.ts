import { Injectable } from '@angular/core';
import { RisultatoAnalisi } from '../stat.model';

@Injectable({
  providedIn: 'root'
})
export class StatsUtilService {

  analizzaArray<T extends Record<string, any>>(elementi: T[]): RisultatoAnalisi {
    console.log('🔥 [StatsUtilService] analizzaArray eseguito su:', elementi);

    const risultato: RisultatoAnalisi = {
      testi: {},
      numeri: {},
      booleani: {},
      totaleElementi: elementi ? elementi.length : 0
    };

    if (!elementi || elementi.length === 0) {
      return risultato;
    }

    // 1. Appiattiamo tutti gli oggetti per trasformare { statsA: { totalXG: 1.2 } } in { "statsA.totalXG": 1.2 }
    const elementiPiattificati = elementi.map(elem => this.flattenObject(elem));

    // 2. Estraiamo tutte le chiavi uniche dai dati piattificati
    const tutteLeChiavi = Array.from(
      new Set(elementiPiattificati.flatMap(obj => Object.keys(obj)))
    );

    tutteLeChiavi.forEach((chiave) => {
      const primoElem = elementiPiattificati.find(
        e => e[chiave] !== null && e[chiave] !== undefined
      );

      if (!primoElem) return;

      const primoValore = primoElem[chiave];
      const eNumerico = typeof primoValore === 'number' ||
        (!isNaN(Number(primoValore)) && typeof primoValore !== 'boolean');

      // --- 1. GESTIONE NUMERICA ---
      if (eNumerico) {
        let min = Infinity;
        let max = -Infinity;
        let somma = 0;
        let conteggioValidi = 0;

        for (const elem of elementiPiattificati) {
          const rawVal = elem[chiave];
          if (rawVal === null || rawVal === undefined) continue;

          const numVal = Number(rawVal);

          // Filtro per escludere valori non validi o sentinel (-1)
          if (!isNaN(numVal) && numVal > -1) {
            if (numVal < min) min = numVal;
            if (numVal > max) max = numVal;
            somma += numVal;
            conteggioValidi++;
          }
        }

        if (conteggioValidi > 0) {
          risultato.numeri[chiave] = {
            min: min,
            max: max,
            media: Number((somma / conteggioValidi).toFixed(2)),
            tot: Number(somma.toFixed(2))
          };
        } else {
          risultato.numeri[chiave] = { min: -1, max: -1, media: -1, tot: 0 };
        }
      }

      // --- 2. GESTIONE BOOLEANA ---
      else if (typeof primoValore === 'boolean') {
        let trueCount = 0;
        let falseCount = 0;

        for (const elem of elementiPiattificati) {
          const val = elem[chiave];
          if (val === true) trueCount++;
          else if (val === false) falseCount++;
        }

        const totaleValidi = trueCount + falseCount;
        const truePerc = totaleValidi > 0 ? (trueCount / totaleValidi) * 100 : 0;
        const falsePerc = totaleValidi > 0 ? (falseCount / totaleValidi) * 100 : 0;

        risultato.booleani[chiave] = {
          trueCount,
          falseCount,
          truePercentuale: `${truePerc.toFixed(2)}%`,
          falsePercentuale: `${falsePerc.toFixed(2)}%`
        };
      }

      // --- 3. GESTIONE STRINGHE ---
      else if (typeof primoValore === 'string') {
        const conteggio: Record<string, number> = {};
        const percentuale: Record<string, string> = {};
        let conteggioStringheValide = 0;

        for (const elem of elementiPiattificati) {
          const val = elem[chiave];
          if (typeof val === 'string') {
            conteggio[val] = (conteggio[val] || 0) + 1;
            conteggioStringheValide++;
          }
        }

        for (const valText in conteggio) {
          const perc = conteggioStringheValide > 0
            ? (conteggio[valText] / conteggioStringheValide) * 100
            : 0;
          percentuale[valText] = `${perc.toFixed(2)}%`;
        }

        risultato.testi[chiave] = { conteggio, percentuale };
      }
    });

    return risultato;
  }

  /**
   * Converte un oggetto nidificato in una struttura a singolo livello con chiavi dot-notation.
   * Es: { statsA: { totalXG: 1.2 } } -> { "statsA.totalXG": 1.2 }
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix = ''
  ): Record<string, any> {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? `${prefix}.` : '';
      const value = obj[k];

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
      ) {
        Object.assign(acc, this.flattenObject(value, `${pre}${k}`));
      } else {
        acc[`${pre}${k}`] = value;
      }

      return acc;
    }, {} as Record<string, any>);
  }
}