import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SimAzioneService } from '../../services/sim-azione.service';
import { LooseBallInput, LooseBallResult } from '../../sim.model';
import { StatsComponent } from '../stats/stats.component';

@Component({
  selector: 'app-sim-loose-ball',
  standalone: true,
  imports: [CommonModule, FormsModule, StatsComponent],
  templateUrl: './sim-loose-ball.component.html',
  styleUrls: ['./sim-loose-ball.component.css']
})
export class SimLooseBallComponent {
  private simAzioneService = inject(SimAzioneService);

  // Input per la palla contesa (Default 0.5)
  public inputData: LooseBallInput = {
    attackerReactivity: 0.5,
    defenderReactivity: 0.5,
    defensiveLine: 0.5
  };

  // Output dell'iterazione massiva (1.000 lanci)
  public results: LooseBallResult[] = [];

  public onSimulateLooseBall(): void {
    this.results = this.simAzioneService.iterate(
      (p) => this.simAzioneService.simulateLooseBall(p),
      1000,
      this.inputData
    );
  }
}