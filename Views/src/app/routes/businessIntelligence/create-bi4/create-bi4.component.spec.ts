import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBI4Component } from './create-bi4.component';

describe('CreateBI4Component', () => {
  let component: CreateBI4Component;
  let fixture: ComponentFixture<CreateBI4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBI4Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBI4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
