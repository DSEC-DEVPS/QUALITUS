import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { EvalRapportService, AgentPole, FiltresRapport } from '../../eval-rapport.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-rapport-pole',
  standalone: true,
  imports: [MatDatepickerModule,
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatTableModule, MatChipsModule, MatTooltipModule,
  ],
  templateUrl: './rapport-pole.component.html',
  styleUrl: './rapport-pole.component.scss',
})
export class RapportPoleComponent implements OnInit {
  private readonly service = inject(EvalRapportService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  agents: AgentPole[] = [];
  chargement = false;
  voirTous = false;
  filtres: FiltresRapport = {};
  sites: { id: number; nom: string }[] = [];
  programmes: { id: number; nom: string }[] = [];
  superviseurs: { id: number; nom: string; prenom: string }[] = [];
  colonnes = ['agent', 'programme', 'site', 'superviseur', 'criteres', 'nb', 'detail'];

  ngOnInit(): void {
    this.charger();
    this.service.getSites().subscribe({ next: s => (this.sites = s || []) });
    this.service.getProgrammes().subscribe({ next: p => (this.programmes = p || []) });
    this.service.getSuperviseurs().subscribe({ next: s => (this.superviseurs = s || []) });
  }

  charger(): void {
    this.chargement = true;
    const f: any = { ...this.filtres };
    if (this.filtres.date_debut) f.date_debut = toYMD(this.filtres.date_debut);
    if (this.filtres.date_fin) f.date_fin = toYMD(this.filtres.date_fin);
    this.service.getAgentsPole(f).subscribe({
      next: r => { this.agents = r.agents || []; this.voirTous = !!r.voir_tous; this.chargement = false; },
      error: () => { this.toastr.error('Erreur de chargement du rapport.'); this.chargement = false; },
    });
  }

  reinitialiser(): void { this.filtres = {}; this.charger(); }

  ouvrirDetail(a: AgentPole): void { this.router.navigate(['/mon-espace/evaluation/agents-pole', a.id]); }
}
