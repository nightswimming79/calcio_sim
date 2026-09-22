import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSequenceInput, GameSequenceResult } from '../../sim-game.model';
import { SimGameService } from '../../services/sim-game.service';
import { SimAzioneService } from '../../services/sim-azione.service';
import { StatsComponent } from '../stats/stats.component';
import { StatsTargets } from '../stats/stats.component';




@Component({
  selector: 'app-sim-sequence',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsComponent
  ],
  templateUrl: './sim-sequence.component.html',
  styleUrls: ['./sim-sequence.component.css']
})
export class SimSequenceComponent {

  // Target basati su partita speculare 50 vs 50 (40 azioni totali)
  expectedTargets: StatsTargets = {
    // Sequenza globale
    'SequenceDetails.CornersCount': { min: 2.5, max: 5.0 },
    'SequenceDetails.CounterAttacksCount': { min: 8.0, max: 18.0 },
    'SequenceDetails.LooseBallsCount': { min: 10.0, max: 20.0 },

    // Squadra A (Punti chiave)
    'StatsA.Goals': { min: 1.0, max: 1.8 },
    'StatsA.TotalXG': { min: 1.20, max: 1.80 },
    'StatsA.XgPerShot': { min: 0.10, max: 0.16 },
    'StatsA.PossessionSharePercent': { min: 48.0, max: 52.0 },

    // Tiri
    'StatsA.Shots.Total': { min: 8.0, max: 12.0 },
    'StatsA.Shots.OnTarget': { min: 3.0, max: 5.0 },
    'StatsA.Shots.Blocked': { min: 2.0, max: 4.0 },
    'StatsA.Shots.Woodwork': { min: 0.1, max: 0.5 },

    // Passaggi per Stato
    'StatsA.PassesByState.OpenPlay': { min: 100.0, max: 150.0 },
    'StatsA.PassesByState.CounterAttack': { min: 10.0, max: 25.0 },
    'StatsA.PassesByState.Corner': { min: 2.0, max: 5.0 },
    'StatsA.PassesByState.LooseBall': { min: 5.0, max: 15.0 },
    'StatsA.PassesByState.Total': { min: 120.0, max: 180.0 },

    // xG per Stato
    'StatsA.XgByState.OpenPlay': { min: 0.70, max: 1.10 },
    'StatsA.XgByState.CounterAttack': { min: 0.25, max: 0.50 },
    'StatsA.XgByState.Corner': { min: 0.10, max: 0.30 },
    'StatsA.XgByState.LooseBall': { min: 0.08, max: 0.20 }
  };


  inputData: GameSequenceInput = {
    teamA: {
      midfield: 50,
      playmaking: 50,
      attack: 50,
      defense: 50,
      pressing: 50,
      goalkeeper: 50,
      cornerAttack: 50,
      cornerDefense: 50
    },
    playstyleA: { verticality: 0.5, defensiveLine: 0.5 },
    teamB: {
      midfield: 50,
      playmaking: 50,
      attack: 50,
      defense: 50,
      pressing: 50,
      goalkeeper: 50,
      cornerAttack: 50,
      cornerDefense: 50
    },
    playstyleB: { verticality: 0.5, defensiveLine: 0.5 },
    startingPossession: 'A'
  };

  results: GameSequenceResult[] = [];


  balanceValue: number = 50;

  // ... inputData e constructor già presenti

  onBalanceChange(val: number): void {
    this.balanceValue = Number(val);
    const valA = this.balanceValue;
    const valB = 100 - this.balanceValue;

    // Aggiorna i 5 parametri della Squadra A
    this.inputData.teamA.midfield = valA;
    this.inputData.teamA.playmaking = valA;
    this.inputData.teamA.attack = valA;
    this.inputData.teamA.defense = valA;
    this.inputData.teamA.pressing = valA;

    // Aggiorna i 5 parametri della Squadra B
    this.inputData.teamB.midfield = valB;
    this.inputData.teamB.playmaking = valB;
    this.inputData.teamB.attack = valB;
    this.inputData.teamB.defense = valB;
    this.inputData.teamB.pressing = valB;
  }
  constructor(
    private simGameService: SimGameService,
    private simAzioneService: SimAzioneService
  ) { }

  onSimulateSequence(): void {

    this.results = this.simAzioneService.iterate(
      (p) => this.simGameService.simulateSequence(p, 20),
      10000,
      this.inputData
    );

  }
}