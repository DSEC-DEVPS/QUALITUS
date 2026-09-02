import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { SondageService } from '@shared/services/sondage.service';
import { ConditionSondage, QuestionSondage, ReponsePassation, Sondage } from '../interfaces';

interface PageGroupe {
  page: number;
  questions: QuestionSondage[];
}

@Component({
  selector: 'app-passation-sondage',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatSliderModule,
    MatProgressBarModule,
  ],
  templateUrl: './passation-sondage.component.html',
  styleUrl: './passation-sondage.component.scss',
})
export class PassationSondageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srv = inject(SondageService);
  private readonly toast = inject(ToastrService);

  mode: 'public' | 'obligatoire' = 'public';
  token = '';
  idSondage = 0;
  chargement = true;
  etat = ''; // OK | INDISPONIBLE | INTROUVABLE
  sondage?: Sondage;
  nomIndispo = '';

  reponses: Record<number, any> = {};
  pageIndex = 0;
  envoi = false;
  termine = false;

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const idOblig = this.route.snapshot.paramMap.get('id');
    if (token) {
      this.mode = 'public';
      this.token = token;
      this.srv.getPublic(token).subscribe({
        next: r => this.appliquer(r.etat, r.sondage, r.nom),
        error: () => {
          this.chargement = false;
          this.etat = 'INTROUVABLE';
        },
      });
    } else if (idOblig) {
      this.mode = 'obligatoire';
      this.idSondage = Number(idOblig);
      this.srv.getObligatoire(this.idSondage).subscribe({
        next: r => {
          // Si rien à faire (déjà fait / non ciblé / indisponible), on rend la main.
          if (r.etat !== 'OK') {
            this.srv.rafraichirObligatoires();
            this.router.navigate(['/mon-espace/dashboard']);
            return;
          }
          this.appliquer(r.etat, r.sondage);
        },
        error: () => this.router.navigate(['/mon-espace/dashboard']),
      });
    } else {
      this.chargement = false;
      this.etat = 'INTROUVABLE';
    }
  }

  private appliquer(etat: string, sondage?: Sondage, nom?: string) {
    this.etat = etat;
    this.chargement = false;
    if (etat === 'OK' && sondage) {
      this.sondage = sondage;
      this.initReponses();
      this.pageIndex = this.premierePageNonVide();
    } else if (etat === 'INDISPONIBLE') {
      this.nomIndispo = nom || '';
    }
  }

  /** Fin d'un sondage obligatoire : le garde enchaîne le suivant ou laisse entrer. */
  continuerApresObligatoire() {
    this.srv.rafraichirObligatoires();
    // On repasse par le dashboard : le garde redirige vers un éventuel sondage restant.
    this.router.navigate(['/mon-espace/dashboard']);
  }

  private get questions(): QuestionSondage[] {
    return this.sondage?.questions || [];
  }

  private initReponses() {
    for (const q of this.questions) {
      if (q.type === 'CLASSEMENT') {
        this.reponses[q.id!] = (q.options || []).map(o => o.id);
      } else if (q.type === 'CHOIX_MULTIPLE') {
        this.reponses[q.id!] = [];
      }
    }
  }

  get pages(): PageGroupe[] {
    const map = new Map<number, QuestionSondage[]>();
    for (const q of this.questions) {
      const p = q.page || 1;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(q);
    }
    return [...map.keys()].sort((a, b) => a - b).map(page => ({ page, questions: map.get(page)! }));
  }

  private questionById(id?: number): QuestionSondage | undefined {
    return this.questions.find(q => q.id === id);
  }

  /* ----- Conditions (question sautée si non remplie) ----- */
  private conditionRemplie(c: ConditionSondage): boolean {
    const src = this.questionById(c.id_Question_source);
    if (!src) return false;
    const rep = this.reponses[c.id_Question_source];
    if (['CHOIX_UNIQUE', 'CHOIX_MULTIPLE', 'CLASSEMENT'].includes(src.type)) {
      const choisis: number[] = Array.isArray(rep) ? rep : rep != null ? [rep] : [];
      const has = choisis.includes(c.id_Option as number);
      return c.operateur === 'DIFFERENT' ? !has : has;
    }
    if (src.type === 'CURSEUR') {
      const v = Number(rep);
      if (isNaN(v)) return false;
      const cv = Number(c.valeur);
      if (c.operateur === 'SUP_EGAL') return v >= cv;
      if (c.operateur === 'INF_EGAL') return v <= cv;
      return v === cv;
    }
    if (src.type === 'OUVERTE') {
      return (rep || '').toString().toLowerCase().includes((c.valeur || '').toLowerCase());
    }
    return true;
  }
  estVisible(q: QuestionSondage): boolean {
    return (q.conditions || []).every(c => this.conditionRemplie(c));
  }

  questionsPage(grp: PageGroupe | undefined): QuestionSondage[] {
    return grp ? grp.questions.filter(q => this.estVisible(q)) : [];
  }
  get pageCourante(): PageGroupe | undefined {
    return this.pages[this.pageIndex];
  }
  get questionsAffichees(): QuestionSondage[] {
    return this.questionsPage(this.pageCourante);
  }

  private premierePageNonVide(): number {
    const pgs = this.pages;
    for (let i = 0; i < pgs.length; i++) {
      if (this.questionsPage(pgs[i]).length) return i;
    }
    return 0;
  }
  get afficherRetour(): boolean {
    if (this.sondage?.bouton_retour !== 1) return false;
    for (let i = this.pageIndex - 1; i >= 0; i--) {
      if (this.questionsPage(this.pages[i]).length) return true;
    }
    return false;
  }
  get estDernierePage(): boolean {
    const pgs = this.pages;
    for (let i = this.pageIndex + 1; i < pgs.length; i++) {
      if (this.questionsPage(pgs[i]).length) return false;
    }
    return true;
  }
  get progression(): number {
    const total = this.pages.length || 1;
    return Math.min(100, Math.round(((this.pageIndex + 1) / total) * 100));
  }

  /* ----- Reponses ----- */
  choixUnique(q: QuestionSondage): number | null {
    return this.reponses[q.id!] ?? null;
  }
  setChoixUnique(q: QuestionSondage, v: number) {
    this.reponses[q.id!] = v;
  }
  estCoche(q: QuestionSondage, idOption: number): boolean {
    return (this.reponses[q.id!] || []).includes(idOption);
  }
  basculer(q: QuestionSondage, idOption: number, checked: boolean) {
    const arr = this.reponses[q.id!] || [];
    this.reponses[q.id!] = checked ? [...arr, idOption] : arr.filter((x: number) => x !== idOption);
  }
  // Classement
  ordre(q: QuestionSondage): number[] {
    return this.reponses[q.id!] || [];
  }
  optionLibelle(q: QuestionSondage, id: number): string {
    return (q.options || []).find(o => o.id === id)?.libelle || '';
  }
  monter(q: QuestionSondage, i: number) {
    if (i <= 0) return;
    const arr = [...this.ordre(q)];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    this.reponses[q.id!] = arr;
  }
  descendre(q: QuestionSondage, i: number) {
    const arr = [...this.ordre(q)];
    if (i >= arr.length - 1) return;
    [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    this.reponses[q.id!] = arr;
  }

  private estRepondu(q: QuestionSondage): boolean {
    const r = this.reponses[q.id!];
    switch (q.type) {
      case 'CHOIX_UNIQUE':
      case 'CURSEUR':
        return r !== null && r !== undefined && r !== '';
      case 'CHOIX_MULTIPLE':
        return Array.isArray(r) && r.length > 0;
      case 'OUVERTE':
        return !!(r || '').toString().trim();
      default:
        return true; // CLASSEMENT (ordre par défaut) / INFO
    }
  }

  /* ----- Navigation ----- */
  continuer() {
    const manquante = this.questionsAffichees.find(
      q => q.type !== 'INFO' && q.obligatoire === 1 && !this.estRepondu(q)
    );
    if (manquante) {
      this.toast.error('Merci de répondre aux questions obligatoires de cette page.');
      return;
    }
    const pgs = this.pages;
    for (let i = this.pageIndex + 1; i < pgs.length; i++) {
      if (this.questionsPage(pgs[i]).length) {
        this.pageIndex = i;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    this.soumettre();
  }
  precedent() {
    for (let i = this.pageIndex - 1; i >= 0; i--) {
      if (this.questionsPage(this.pages[i]).length) {
        this.pageIndex = i;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
  }

  private soumettre() {
    const reponses: ReponsePassation[] = [];
    for (const q of this.questions) {
      if (q.type === 'INFO' || !this.estVisible(q)) continue;
      const r = this.reponses[q.id!];
      if (q.type === 'CHOIX_UNIQUE') {
        if (r != null) reponses.push({ id_Question: q.id!, id_Options: [r] });
      } else if (q.type === 'CHOIX_MULTIPLE') {
        if (Array.isArray(r) && r.length) reponses.push({ id_Question: q.id!, id_Options: r });
      } else if (q.type === 'CLASSEMENT') {
        if (Array.isArray(r) && r.length) reponses.push({ id_Question: q.id!, classement: r });
      } else if (q.type === 'CURSEUR') {
        if (r != null) reponses.push({ id_Question: q.id!, valeur_num: Number(r) });
      } else if (q.type === 'OUVERTE') {
        if ((r || '').toString().trim()) reponses.push({ id_Question: q.id!, valeur_texte: r });
      }
    }
    this.envoi = true;
    const obs =
      this.mode === 'obligatoire'
        ? this.srv.soumettreObligatoire(this.idSondage, reponses)
        : this.srv.soumettrePublic(this.token, reponses);
    obs.subscribe({
      next: () => {
        this.envoi = false;
        this.termine = true;
        if (this.mode === 'obligatoire') {
          this.srv.rafraichirObligatoires();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.envoi = false;
        this.toast.error("Une erreur s'est produite lors de l'envoi.");
      },
    });
  }
}
