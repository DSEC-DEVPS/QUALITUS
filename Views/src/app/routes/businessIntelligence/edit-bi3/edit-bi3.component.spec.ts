import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBI3Component } from './edit-bi3.component';

describe('EditBI3Component', () => {
  let component: EditBI3Component;
  let fixture: ComponentFixture<EditBI3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBI3Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBI3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
