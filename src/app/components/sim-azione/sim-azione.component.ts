import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionSimulationResult, SimulationInput } from '../../sim.model';
import { SimAzioneService } from '../../services/sim-azione.service';
import { StatsComponent } from '../stats/stats.component';


@Component({
  selector: 'app-sim-azione',
  standalone: true,
  imports: [CommonModule, FormsModule, StatsComponent],
  templateUrl: './sim-azione.component.html',
  styleUrls: ['./sim-azione.component.css']
})
export class SimAzioneComponent {
  private simAzioneService = inject(SimAzioneService);

  public inputData: SimulationInput = {
    attackingTeam: {
      midfield: 50,
      playmaking: 50,
      attack: 50,
      defense: 50,
      pressing: 50,
      goalkeeper: 50,
      cornerAttack: 50,
      cornerDefense: 50
    },
    defendingTeam: {
      midfield: 50,
      playmaking: 50,
      attack: 50,
      defense: 50,
      pressing: 50,
      goalkeeper: 50,
      cornerAttack: 50,
      cornerDefense: 50
    },
    // Forniamo l'oggetto playstyle definito in modo da evitare l'undefined
    playstyle: {
      verticality: 0.5,
      defensiveLine: 0.5
    }
  };

  public results: ActionSimulationResult[] | null = null;

  public onSimulate(): void {

    this.results = this.simAzioneService.iterate((p) => this.simAzioneService.simulatePossession(p), 1000, this.inputData);

  }
}