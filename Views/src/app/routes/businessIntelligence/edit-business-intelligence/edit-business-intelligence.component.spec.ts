import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBusinessIntelligenceComponent } from './edit-business-intelligence.component';

describe('EditBusinessIntelligenceComponent', () => {
  let component: EditBusinessIntelligenceComponent;
  let fixture: ComponentFixture<EditBusinessIntelligenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBusinessIntelligenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBusinessIntelligenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
