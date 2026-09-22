import { Routes } from '@angular/router';
import { SimAzioneComponent } from './components/sim-azione/sim-azione.component';
import { SimTiroComponent } from './components/sim-tiro/sim-tiro.component';
import { SimCounterAttackComponent } from './components/sim-counter-attack/sim-counter-attack.component';
import { SimAzioneFullComponent } from './components/sim-azione-full/sim-azione-full.component';
import { SimSequenceComponent } from './components/sim-sequence/sim-sequence.component';
import { SimCornerComponent } from './components/sim-corner/sim-corner.component';
import { SimLooseBallComponent } from './components/sim-loose-ball/sim-loose-ball.component';

export const routes: Routes = [
  { path: '', redirectTo: 'sim-azione', pathMatch: 'full' },
  { path: 'sim-azione', component: SimAzioneComponent },
  { path: 'sim-azione-full', component: SimAzioneFullComponent },
  { path: 'sim-tiro', component: SimTiroComponent },
  { path: 'sim-contropiede', component: SimCounterAttackComponent },
  { path: 'sim-sequenza', component: SimSequenceComponent },
  { path: 'sim-corner', component: SimCornerComponent },
  { path: 'sim-loose-ball', component: SimLooseBallComponent },
  { path: '**', redirectTo: 'sim-azione' }
];