import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ModalityService } from './modality';

describe('ModalityService', () => {
  let service: ModalityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ModalityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
