import { TestBed } from '@angular/core/testing';

import { SimBatchRunnerService } from './sim-batch-runner.service';

describe('SimBatchRunnerService', () => {
  let service: SimBatchRunnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimBatchRunnerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
