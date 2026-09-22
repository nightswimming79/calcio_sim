import { Component, Input, computed, signal, inject } from '@angular/core';
import { KeyValuePipe, NgClass } from '@angular/common';
import { StatsUtilService } from '../../services/stats-util.service';

export interface MetricTarget {
  min: number;
  max: number;
}

export type StatsTargets = Record<string, MetricTarget>;

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [KeyValuePipe, NgClass],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent {
  private statsService = inject(StatsUtilService);

  private _results = signal<Record<string, any>[]>([]);
  private _targets = signal<StatsTargets>({});

  @Input({ required: true })
  set results(val: Record<string, any>[] | null | undefined) {
    this._results.set(val || []);
  }

  @Input()
  set targets(val: StatsTargets | null | undefined) {
    this._targets.set(val || {});
  }

  report = computed(() => this.statsService.analizzaArray(this._results()));

  /**
   * Cerca la regola target per una chiave in modo case-insensitive.
   */
  private getTargetForKey(key: string): MetricTarget | null {
    const targets = this._targets();
    if (!targets) return null;

    if (targets[key]) return targets[key];

    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(targets).find(k => k.toLowerCase() === lowerKey);

    return foundKey ? targets[foundKey] : null;
  }

  hasTarget(key: string): boolean {
    return this.getTargetForKey(key) !== null;
  }

  isOutOfTarget(key: string, media: number): boolean {
    const target = this.getTargetForKey(key);
    if (!target) return false;
    return media < target.min || media > target.max;
  }

  getTargetLabel(key: string): string | null {
    const target = this.getTargetForKey(key);
    if (!target) return null;
    return `Target: [${target.min} - ${target.max}]`;
  }
}