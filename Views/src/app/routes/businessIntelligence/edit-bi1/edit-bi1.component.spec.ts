import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBI1Component } from './edit-bi1.component';

describe('EditBI1Component', () => {
  let component: EditBI1Component;
  let fixture: ComponentFixture<EditBI1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBI1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBI1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
