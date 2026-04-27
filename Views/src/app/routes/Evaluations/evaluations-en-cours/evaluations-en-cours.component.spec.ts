import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationsEnCoursComponent } from './evaluations-en-cours.component';

describe('EvaluationsEnCoursComponent', () => {
  let component: EvaluationsEnCoursComponent;
  let fixture: ComponentFixture<EvaluationsEnCoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationsEnCoursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationsEnCoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
