import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBI4Component } from './edit-bi4.component';

describe('EditBI4Component', () => {
  let component: EditBI4Component;
  let fixture: ComponentFixture<EditBI4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBI4Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBI4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
