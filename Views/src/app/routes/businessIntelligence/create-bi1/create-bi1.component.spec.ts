import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBI1Component } from './create-bi1.component';

describe('CreateBI1Component', () => {
  let component: CreateBI1Component;
  let fixture: ComponentFixture<CreateBI1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBI1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBI1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
