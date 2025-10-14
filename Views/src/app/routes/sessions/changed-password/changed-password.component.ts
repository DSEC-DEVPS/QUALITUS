import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { ControlsOf, IProfile } from '@shared';

@Component({
  selector: 'app-changed-password',
  templateUrl: './changed-password.component.html',
  styleUrl: './changed-password.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangedPasswordComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastSrv = inject(ToastrService);
  private readonly router = inject(Router);
  passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!%*?&])[A-Za-z\d@!%*?&]{8,}$/;

  imageOrangeLogo = 'img/Orange_logo.png';
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
  // Accesseurs pour faciliter l'utilisation dans le template
  get passwordControl() {
    return this.form.get('nouveau_mot_de_passe');
  }
  get confirmPasswordControl() {
    return this.form.get('confirme_mot_de_passe');
  }
  onSubmit() {
    this.userService.change_password(this.form.value).subscribe({
      next: result => {
        this.router.navigateByUrl('auth/login');
      },
      error: error => {
        this.toastSrv.error(error.message);
      },
    });
  }
}
