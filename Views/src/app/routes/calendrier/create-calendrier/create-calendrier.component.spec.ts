import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCalendrierComponent } from './create-calendrier.component';

describe('CreateCalendrierComponent', () => {
  let component: CreateCalendrierComponent;
  let fixture: ComponentFixture<CreateCalendrierComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCalendrierComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCalendrierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
