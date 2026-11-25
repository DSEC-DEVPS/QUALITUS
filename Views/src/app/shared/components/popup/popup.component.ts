import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Données de la fenêtre de résultat (quiz d'une fiche, contrôle d'exactitude…). */
export interface ResultatScore {
  /** Score de 0 à 100 : remplit l'anneau et choisit la couleur. */
  score: number;
  /** Phrase d'explication sous le titre. */
  message: string;
  /** Titre ; par défaut selon le score (« Bravo ! », « Presque ! », « Pas cette fois »). */
  titre?: string;
  /** Texte au centre de l'anneau ; par défaut « 75 % ». */
  centre?: string;
  /** Légende sous le texte central (ex. « bonnes réponses »). */
  legende?: string;
}

type Niveau = 'reussi' | 'moyen' | 'echec';

const CIRCONFERENCE = 2 * Math.PI * 52;

/**
 * Fenêtre de résultat animée, sans aucune ressource externe (icônes Material et CSS uniquement) :
 * apparition avec rebond, anneau qui se remplit, confettis pour un score parfait.
 * Les animations sont coupées si l'utilisateur a demandé à réduire les mouvements.
 */
@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupComponent {
  readonly niveau: Niveau;
  readonly icone: string;
  readonly titre: string;
  readonly centre: string;
  readonly circonference = CIRCONFERENCE;
  readonly decalage: number;
  readonly confettis: { gauche: number; delai: number; duree: number; couleur: string; rotation: number }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ResultatScore,
    private dialogRef: MatDialogRef<PopupComponent>
  ) {
    const score = Math.max(0, Math.min(100, Number(data.score) || 0));
    this.niveau = score >= 100 ? 'reussi' : score >= 50 ? 'moyen' : 'echec';
    this.icone = { reussi: 'emoji_events', moyen: 'trending_up', echec: 'replay' }[this.niveau];
    this.titre = data.titre ?? { reussi: 'Bravo !', moyen: 'Presque !', echec: 'Pas cette fois' }[this.niveau];
    this.centre = data.centre ?? `${score} %`;
    // L'anneau part de vide et se remplit jusqu'au score (animation CSS sur stroke-dashoffset).
    this.decalage = CIRCONFERENCE * (1 - score / 100);

    if (this.niveau === 'reussi') {
      const couleurs = ['#ff7900', '#ffb74d', '#50be87', '#4bb4e6', '#ffd200', '#a885d8'];
      for (let i = 0; i < 24; i++) {
        this.confettis.push({
          gauche: (i * 37) % 100,
          delai: (i % 6) * 0.08,
          duree: 1.2 + ((i * 7) % 5) * 0.12,
          couleur: couleurs[i % couleurs.length],
          rotation: (i * 53) % 360,
        });
      }
    }
  }

  fermer(): void {
    this.dialogRef.close();
  }
}
