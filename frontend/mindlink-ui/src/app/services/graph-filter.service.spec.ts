import { TestBed } from '@angular/core/testing';

import { GraphFilterService } from './graph-filter.service';

describe('GraphFilterService', () => {
  let service: GraphFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
