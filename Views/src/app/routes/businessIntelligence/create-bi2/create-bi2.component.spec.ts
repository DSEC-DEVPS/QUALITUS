import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBI2Component } from './create-bi2.component';

describe('CreateBI2Component', () => {
  let component: CreateBI2Component;
  let fixture: ComponentFixture<CreateBI2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBI2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBI2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
