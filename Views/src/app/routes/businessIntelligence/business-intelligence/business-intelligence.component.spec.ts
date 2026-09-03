import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessIntelligenceComponent } from './business-intelligence.component';

describe('BusinessIntelligenceComponent', () => {
  let component: BusinessIntelligenceComponent;
  let fixture: ComponentFixture<BusinessIntelligenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessIntelligenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessIntelligenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
