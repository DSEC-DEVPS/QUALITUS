import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService, TokenService, isSafeReturnUrl } from '@core/authentication';
import { CommonModule } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { PermissionsService } from '@core/authorization/permissions.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly toastSrv = inject(ToastrService);
  private readonly permissions = inject(PermissionsService);
  public loading = false;
  loginForm!: FormGroup;
  imageOrangeLogo = 'img/Orange_logo.png';
  isSubmitting = false;

  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }
  ngOnInit(): void {
    this.loginForm = this.fb.nonNullable.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }
  get username() {
    return this.loginForm.get('username')!;
  }

  get password() {
    return this.loginForm.get('password')!;
  }

  get rememberMe() {
    return this.loginForm.get('rememberMe')!;
  }

  login() {
    this.loading = true;
    this.isSubmitting = true;
    console.log(this.loginForm.value);
    this.auth
      .login(this.username.value, this.password.value, this.rememberMe.value)
      .pipe(filter(authenticated => authenticated))
      .subscribe({
        next: () => {
          if (this.tokenService.token_object()?.token_nb_sesseion === 1) {
            this.toastSrv.info('Merci de changer votre mot de passe par défaut.');
            this.loading = false;

            this.router.navigateByUrl('auth/change-password');
          } else {
            // Retour à la page d'origine (session expirée) si l'URL est sûre.
            // On attend le chargement des permissions : les routes protégées par
            // canMatchPermission en ont besoin, sinon redirection vers le tableau de bord.
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
            if (isSafeReturnUrl(returnUrl)) {
              this.permissions.load().subscribe(() => this.router.navigateByUrl(returnUrl));
            } else {
              this.router.navigateByUrl('');
            }
          }
        },
        error: (errorRes: HttpErrorResponse) => {
          this.loading = false;
          if (errorRes.status === 422) {
            const form = this.loginForm;
            const errors = errorRes.error.errors;
            Object.keys(errors).forEach(key => {
              form.get(key === 'email' ? 'username' : key)?.setErrors({
                remote: errors[key][0],
              });
            });
          }
          this.isSubmitting = false;
        },
      });
  }

  onReset() {
    this.loginForm.reset();
  }
}
