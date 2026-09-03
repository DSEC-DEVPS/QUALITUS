import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSupplementairesComponent } from './create-supplementaires.component';

describe('CreateSupplementairesComponent', () => {
  let component: CreateSupplementairesComponent;
  let fixture: ComponentFixture<CreateSupplementairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSupplementairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateSupplementairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
