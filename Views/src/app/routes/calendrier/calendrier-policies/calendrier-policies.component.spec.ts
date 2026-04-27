import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendrierPoliciesComponent } from './calendrier-policies.component';

describe('CalendrierPoliciesComponent', () => {
  let component: CalendrierPoliciesComponent;
  let fixture: ComponentFixture<CalendrierPoliciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendrierPoliciesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendrierPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
