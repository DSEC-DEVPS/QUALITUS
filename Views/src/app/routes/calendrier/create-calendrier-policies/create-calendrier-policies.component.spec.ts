import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCalendrierPoliciesComponent } from './create-calendrier-policies.component';

describe('CreateCalendrierPoliciesComponent', () => {
  let component: CreateCalendrierPoliciesComponent;
  let fixture: ComponentFixture<CreateCalendrierPoliciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCalendrierPoliciesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCalendrierPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
