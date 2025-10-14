import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { AuthService } from '@core';

import { ControlsOf, IProfile } from '@shared';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatTabsModule,
    CommonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  form!: FormGroup;
  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }
  ngOnInit(): void {
    this.form = new FormGroup(
      {
        ancien_mot_de_passe: new FormControl('', [Validators.required]),
        nouveau_mot_de_passe: new FormControl('', [Validators.required]),
        confirme_mot_de_passe: new FormControl('', [Validators.required]),
      },
      {
        validators: this.passWordMatchValidator,
      }
    );
  }
  getErrorMessage(form: FormGroup<ControlsOf<IProfile>>) {
    return form.get('email')?.hasError('required')
      ? 'validation.required'
      : form.get('email')?.hasError('email')
        ? 'validation.invalid_email'
        : '';
  }
  passWordMatchValidator(control: AbstractControl) {
    return control.get('nouveau_mot_de_passe')?.value ===
      control.get('confirme_mot_de_passe')?.value
      ? null
      : { mismatch: true };
  }
  onSubmit() {
    this.userService.change_password(this.form.value).subscribe({
      next: result => {
        this.toastSrv.success(result.message);
        this.form.reset();
        setInterval(() => {
          this.auth.logout().subscribe(() => {
            this.router.navigateByUrl('/auth/login');
          });
        }, 1000);
      },
      error: error => {
        console.log(error);
        this.toastSrv.error(error.message);
      },
    });
  }
  onReset() {
    this.form.reset();
  }
}
