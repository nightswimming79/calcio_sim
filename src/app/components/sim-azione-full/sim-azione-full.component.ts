import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SingleActionInput, SingleActionResult } from '../../sim.model';
import { SimAzioneService } from '../../services/sim-azione.service';
import { StatsComponent } from '../stats/stats.component';

@Component({
  selector: 'app-sim-azione-full',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsComponent
  ],
  templateUrl: './sim-azione-full.component.html',
  styleUrls: ['./sim-azione-full.component.css']
})
export class SimAzioneFullComponent {

  inputData: SingleActionInput = {
    teamA: { midfield: 50, playmaking: 50, attack: 50, defense: 50, pressing: 50, goalkeeper: 50, cornerAttack: 50, cornerDefense: 50 },
    playstyleA: { verticality: 0.5, defensiveLine: 0.5 },
    teamB: { midfield: 50, playmaking: 50, attack: 50, defense: 50, pressing: 50, goalkeeper: 50, cornerAttack: 50, cornerDefense: 50 },
    playstyleB: { verticality: 0.5, defensiveLine: 0.5 },
    startingPossession: 'A'
  };

  results: SingleActionResult[] = [];

  constructor(private simAzioneService: SimAzioneService) { }

  onSimulateFull(): void {

    // this.results = this.simAzioneService.iterate((p) => this.simAzioneService.simulateFullAction(p), 18640, this.inputData);

  }
}