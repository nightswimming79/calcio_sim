import { TestBed } from '@angular/core/testing';

import { StatsUtilService } from './stats-util.service';

describe('StatsUtilService', () => {
  let service: StatsUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
