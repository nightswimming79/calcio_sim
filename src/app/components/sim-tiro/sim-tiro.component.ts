import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SimAzioneService } from '../../services/sim-azione.service';
import { ShotXGInput, ExtendedShotXGResult } from '../../sim.model';
import { StatsUtilService } from '../../services/stats-util.service';
import { StatsComponent } from '../stats/stats.component';

@Component({
  selector: 'app-sim-tiro',
  standalone: true,
  imports: [CommonModule, FormsModule, StatsComponent],
  templateUrl: './sim-tiro.component.html',
  styleUrls: ['./sim-tiro.component.css']
})
export class SimTiroComponent {
  private simAzioneService = inject(SimAzioneService);
  private statsService = inject(StatsUtilService);

  // Input del Form (Valori di Default con media 0.5)
  public inputData: ShotXGInput = {
    baseXG: 0.25,
    attacker: 0.5,
    defender: 0.5,
    goalkeeper: 0.5
  };

  // Output della simulazione del tiro con il nuovo tipo esteso
  public results: ExtendedShotXGResult[] = [];

  public onSimulateShot(): void {
    this.results = this.simAzioneService.iterate(
      (p) => this.simAzioneService.calculateShotXG(p),
      10000,
      this.inputData
    );
  }
}