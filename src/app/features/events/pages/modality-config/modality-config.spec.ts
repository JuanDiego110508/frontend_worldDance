import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalityConfig } from './modality-config';

describe('ModalityConfig', () => {
  let component: ModalityConfig;
  let fixture: ComponentFixture<ModalityConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalityConfig],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalityConfig);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
