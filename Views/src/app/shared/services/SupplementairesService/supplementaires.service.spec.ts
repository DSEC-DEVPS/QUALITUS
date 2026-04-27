import { TestBed } from '@angular/core/testing';

import { SupplementairesService } from './supplementaires.service';

describe('SupplementairesService', () => {
  let service: SupplementairesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupplementairesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
