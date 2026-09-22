import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimAzioneService } from '../../services/sim-azione.service';
import { CounterAttackInput, CounterAttackResult } from '../../sim.model';
import { StatsComponent } from '../stats/stats.component';


@Component({
  selector: 'app-sim-counter-attack',
  standalone: true,
  imports: [CommonModule, FormsModule, StatsComponent],
  templateUrl: './sim-counter-attack.component.html',
  styleUrls: ['./sim-counter-attack.component.css']
})
export class SimCounterAttackComponent {
  private simAzioneService = inject(SimAzioneService);

  // Input del Form per la simulazione del Contropiede
  public inputData: CounterAttackInput = {
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
    counterAttackRisk: 0.5, // Valore di rischio ereditato dalla palla persa avversaria
    highRecovery: false      // Se la palla è stata recuperata alta (es. trequarti campo)
  };

  // Output della simulazione del contropiede
  public results: CounterAttackResult[] | null = null;

  public onSimulateCounterAttack(): void {
    this.results = this.simAzioneService.iterate((p) => this.simAzioneService.simulateCounterAttack(p), 1000, this.inputData);

  }
}