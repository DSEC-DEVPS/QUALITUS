import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompletionSupplementairesComponent } from './completion-supplementaires.component';

describe('CompletionSupplementairesComponent', () => {
  let component: CompletionSupplementairesComponent;
  let fixture: ComponentFixture<CompletionSupplementairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionSupplementairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletionSupplementairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
