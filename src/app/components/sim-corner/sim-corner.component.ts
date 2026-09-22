import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SimAzioneService } from '../../services/sim-azione.service';
import { CornerInput, CornerResult } from '../../sim.model';
import { StatsComponent } from '../stats/stats.component';

@Component({
  selector: 'app-sim-corner',
  standalone: true,
  imports: [CommonModule, FormsModule, StatsComponent],
  templateUrl: './sim-corner.component.html',
  styleUrls: ['./sim-corner.component.css']
})
export class SimCornerComponent {
  private simAzioneService = inject(SimAzioneService);

  // Input per il duello aereo da calcio d'angolo (Default a 0.5)
  public inputData: CornerInput = {
    attackerAerial: 0.5,
    defenderAerial: 0.5,
    goalkeeperExit: 0.5
  };

  // Output dell'iterazione di 1.000 calci d'angolo
  public results: CornerResult[] = [];

  public onSimulateCorner(): void {
    this.results = this.simAzioneService.iterate(
      (p) => this.simAzioneService.simulateCorner(p),
      1000,
      this.inputData
    );
  }
}