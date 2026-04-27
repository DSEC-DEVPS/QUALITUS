import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditCalendrierPoliciesComponent } from './edit-calendrier-policies.component';

describe('EditCalendrierPoliciesComponent', () => {
  let component: EditCalendrierPoliciesComponent;
  let fixture: ComponentFixture<EditCalendrierPoliciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCalendrierPoliciesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditCalendrierPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
