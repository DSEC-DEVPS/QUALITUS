import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBusinessIntelligenceComponent } from './create-business-intelligence.component';

describe('CreateBusinessIntelligenceComponent', () => {
  let component: CreateBusinessIntelligenceComponent;
  let fixture: ComponentFixture<CreateBusinessIntelligenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBusinessIntelligenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBusinessIntelligenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
