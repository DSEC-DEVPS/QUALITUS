import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
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
import { UserService } from '@shared/services/user.service';

@Component({
  selector: 'app-modify-password',
  standalone: true,
  templateUrl: './modify-password.component.html',
  styleUrl: './modify-password.component.scss',
  imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModifyPasswordComponent implements OnInit {
  imageOrangeLogo = 'img/Orange_logo.png';
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  formGroup!: FormGroup;
  ngOnInit(): void {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!%*?&])[A-Za-z\d@!%*?&]{8,}$/;
    this.formGroup = this.fb.group({
      ancien_mot_de_passe: ['', [Validators.required]],
      nouveau_mot_de_passe: ['', [Validators.required, Validators.pattern(passwordRegex)]],
      confirme_mot_de_passe: ['', [Validators.required, Validators.pattern(passwordRegex)]],
    });
  }
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const nouveau_mot_de_passe = control.get('nouveau_mot_de_passe')?.value;
    const confirme_mot_de_passe = control.get('confirme_mot_de_passe')?.value;

    if (
      nouveau_mot_de_passe &&
      confirme_mot_de_passe &&
      nouveau_mot_de_passe !== confirme_mot_de_passe
    ) {
      control.get('confirme_mot_de_passe')?.setErrors({ matching: true });
      return { matching: true };
    } else {
      return null;
    }
  }

  onSubmit() {
    this.userService.change_password(this.formGroup.value).subscribe({
      next: () => {
        this.router.navigateByUrl('');
      },
      error: error => {
        console.log(error);
      },
    });
  }
  onIgnore() {
    this.router.navigateByUrl('');
  }
}
