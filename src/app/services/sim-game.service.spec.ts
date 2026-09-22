import { TestBed } from '@angular/core/testing';

import { SimGameService } from './sim-game.service';

describe('SimGameService', () => {
  let service: SimGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
