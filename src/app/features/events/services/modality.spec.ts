import { TestBed } from '@angular/core/testing';

import { Modality } from './modality';

describe('Modality', () => {
  let service: Modality;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Modality);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
