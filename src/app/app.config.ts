import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SimAzioneService } from './services/sim-azione.service';


export function initializeApp(): () => void {
  return () => {
    // Inizializzazione dell'applicazione
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [SimAzioneService],
      multi: true
    }
  ]
};