import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService, maVoixCompte, motif_ma_voix_compte, User } from '@core';
import { UserService } from '@shared/services/user.service';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-ajouter-sla',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
  ],
  templateUrl: './ajouter-ma-voix-compte.component.html',
  styleUrl: './ajouter-ma-voix-compte.component.scss',
})
export class AjouterMaVoixCompteComponent implements OnInit {
  private readonly autService = inject(AuthService);
  private readonly toastSrv = inject(ToastrService);
  isSubmitting = false;
  user!: User;
  private readonly fb = inject(FormBuilder);
  MavoixFormGroup!: FormGroup;
  motifMaVoix!: motif_ma_voix_compte[];
  downloadData!: maVoixCompte[];
  private readonly userService = inject(UserService);
  voiceUrl = 'img/ma_voix_img.jpg';

  ngOnInit(): void {
    this.userService.getAllMotifMaVoix().subscribe({
      next: result => {
        this.motifMaVoix = result;
        console.log(this.motifMaVoix);
      },
      error: error => {
        console.log(error);
      },
    });
    this.MavoixFormGroup = this.fb.group({
      motif_ma_voix_compte: [null, [Validators.required]],
      message: [null, [Validators.required]],
    });

    this.autService.user().subscribe({
      next: user => {
        this.user = user;
      },
      error: error => {
        console.log(error);
      },
    });
  }

  add_ma_voix_compte() {
    this.isSubmitting = true;
    this.userService.add_ma_voix_compte(this.MavoixFormGroup.value).subscribe({
      error: () => {
        this.toastSrv.error('Merci de vérifier une erreur est produite');
        this.isSubmitting = false;
      },
      next: message => {
        this.toastSrv.success(`${message.message}`);
        this.isSubmitting = false;
        this.MavoixFormGroup.reset();
      },
    });
  }
}
