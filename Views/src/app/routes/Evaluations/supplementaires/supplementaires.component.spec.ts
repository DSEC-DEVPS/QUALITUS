import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplementairesComponent } from './supplementaires.component';

describe('SupplementairesComponent', () => {
  let component: SupplementairesComponent;
  let fixture: ComponentFixture<SupplementairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplementairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplementairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
