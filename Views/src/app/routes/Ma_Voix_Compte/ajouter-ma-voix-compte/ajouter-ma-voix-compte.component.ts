import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { motif_ma_voix_compte } from '@core';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

/** Longueur maximale d'un message (identique au contrôle serveur). */
export const MA_VOIX_MESSAGE_MAX = 2000;

/**
 * « Ma voix compte » : message ANONYME (motif + texte). L'auteur n'est ni envoyé ni
 * enregistré par le serveur.
 */
@Component({
  selector: 'app-ajouter-ma-voix-compte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './ajouter-ma-voix-compte.component.html',
  styleUrl: './ajouter-ma-voix-compte.component.scss',
})
export class AjouterMaVoixCompteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toastSrv = inject(ToastrService);
  private readonly userService = inject(UserService);

  readonly max = MA_VOIX_MESSAGE_MAX;
  readonly voiceUrl = 'img/ma_voix_img.jpg';
  motifs: motif_ma_voix_compte[] = [];
  chargementMotifs = true;
  envoi = false;
  /** Message envoyé : affiche la confirmation à la place du formulaire. */
  envoye = false;

  form: FormGroup = this.fb.group({
    motif_ma_voix_compte: [null, Validators.required],
    message: ['', [Validators.required, Validators.maxLength(MA_VOIX_MESSAGE_MAX), Validators.pattern(/\S/)]],
  });

  ngOnInit(): void {
    this.userService
      .getAllMotifMaVoix()
      .pipe(finalize(() => (this.chargementMotifs = false)))
      .subscribe({
        next: l => (this.motifs = l || []),
        error: () => this.toastSrv.error('Impossible de charger les motifs.'),
      });
  }

  get longueur(): number {
    return (this.form.get('message')?.value || '').length;
  }

  envoyer(): void {
    if (this.form.invalid || this.envoi) {
      this.form.markAllAsTouched();
      return;
    }
    this.envoi = true;
    const v = this.form.value;
    this.userService
      .add_ma_voix_compte({ motif_ma_voix_compte: v.motif_ma_voix_compte, message: String(v.message).trim() })
      .pipe(finalize(() => (this.envoi = false)))
      .subscribe({
        next: () => {
          this.envoye = true;
          this.form.reset({ motif_ma_voix_compte: null, message: '' });
        },
        // Message précis du serveur affiché par l'intercepteur global (400) ;
        // sinon message générique.
        error: e => {
          if (e?.status !== 400) {
            this.toastSrv.error("Votre message n'a pas pu être envoyé. Réessayez dans un instant.");
          }
        },
      });
  }

  nouveauMessage(): void {
    this.envoye = false;
  }
}
