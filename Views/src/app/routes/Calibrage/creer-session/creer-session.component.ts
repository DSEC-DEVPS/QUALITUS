import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '@shared/services/user.service';
import { CalibrageService } from '../calibrage.service';

@Component({
  selector: 'app-cal-creer-session',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
  ],
  templateUrl: './creer-session.component.html',
  styleUrl: './creer-session.component.scss',
})
export class CreerSessionComponent implements OnInit {
  private readonly service = inject(CalibrageService);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  sites: any[] = [];
  grilles: any[] = [];
  envoi = false;

  model: any = {
    nom: '', description: '', date_calibrage: null as any, id_site: null,
    id_grille: null, nombre_transactions: null, duree_heures: 1, duree_minutes_reste: 0,
  };

  ngOnInit(): void {
    this.userService.getAllSite().subscribe({ next: s => (this.sites = s || []) });
    this.userService.getEvalGrillesActives().subscribe({ next: g => (this.grilles = g || []) });
  }

  valide(): boolean {
    return !!(this.model.nom && this.model.nom.trim() && this.model.date_calibrage &&
      this.model.id_site && this.model.id_grille && this.model.nombre_transactions > 0 &&
      this.dureeMinutes() > 0);
  }

  dureeMinutes(): number {
    return (Number(this.model.duree_heures) || 0) * 60 + (Number(this.model.duree_minutes_reste) || 0);
  }

  creer(): void {
    if (!this.valide()) { this.toastr.warning('Veuillez renseigner tous les champs obligatoires.'); return; }
    this.envoi = true;
    this.service.createSession({
      nom: this.model.nom.trim(),
      description: this.model.description || null,
      date_calibrage: this.model.date_calibrage,
      id_site: this.model.id_site,
      id_grille: this.model.id_grille,
      nombre_transactions: this.model.nombre_transactions,
      duree_minutes: this.dureeMinutes(),
    }).subscribe({
      next: r => { this.toastr.success('Session créée.'); this.router.navigate(['/mon-espace/calibrage/preparer', r.id]); },
      error: err => { this.envoi = false; this.toastr.error(err?.error?.message || 'Erreur lors de la création.'); },
    });
  }

  annuler(): void { this.router.navigate(['/mon-espace/calibrage/sessions']); }
}
