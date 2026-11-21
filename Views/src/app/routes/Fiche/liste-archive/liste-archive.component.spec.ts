import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeArchiveComponent } from './liste-archive.component';

describe('ListeArchiveComponent', () => {
  let component: ListeArchiveComponent;
  let fixture: ComponentFixture<ListeArchiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeArchiveComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideAnimationsAsync(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeArchiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
