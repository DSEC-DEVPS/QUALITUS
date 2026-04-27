import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompletionEvaluationsComponent } from './completion-evaluations.component';

describe('CompletionEvaluationsComponent', () => {
  let component: CompletionEvaluationsComponent;
  let fixture: ComponentFixture<CompletionEvaluationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionEvaluationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletionEvaluationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
