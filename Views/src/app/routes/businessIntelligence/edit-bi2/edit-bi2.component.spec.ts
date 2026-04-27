import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBI2Component } from './edit-bi2.component';

describe('EditBI2Component', () => {
  let component: EditBI2Component;
  let fixture: ComponentFixture<EditBI2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBI2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBI2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
