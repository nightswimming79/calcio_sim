import { TestBed } from '@angular/core/testing';

import { SimAzioneService } from './sim-azione.service';

describe('SimAzioneService', () => {
  let service: SimAzioneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimAzioneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
