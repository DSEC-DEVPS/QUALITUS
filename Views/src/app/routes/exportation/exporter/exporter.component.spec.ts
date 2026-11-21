import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideToastr } from 'ngx-toastr';
import { NgxPermissionsModule } from 'ngx-permissions';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExporterComponent } from './exporter.component';

describe('ExporterComponent', () => {
  let component: ExporterComponent;
  let fixture: ComponentFixture<ExporterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExporterComponent, NgxPermissionsModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideAnimationsAsync(), provideToastr(), provideNativeDateAdapter()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExporterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
