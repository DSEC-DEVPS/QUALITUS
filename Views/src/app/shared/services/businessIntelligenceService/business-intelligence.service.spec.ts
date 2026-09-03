import { TestBed } from '@angular/core/testing';

import { BusinessIntelligenceService } from './business-intelligence.service';

describe('BusinessIntelligenceService', () => {
  let service: BusinessIntelligenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BusinessIntelligenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
