import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateEvaluationsComponent } from './create-evaluations.component';

describe('CreateEvaluationsComponent', () => {
  let component: CreateEvaluationsComponent;
  let fixture: ComponentFixture<CreateEvaluationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEvaluationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateEvaluationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
