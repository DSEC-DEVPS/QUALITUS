import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBI3Component } from './create-bi3.component';

describe('CreateBI3Component', () => {
  let component: CreateBI3Component;
  let fixture: ComponentFixture<CreateBI3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBI3Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBI3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
