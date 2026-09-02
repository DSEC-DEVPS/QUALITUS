import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { EvaluationService } from '@shared/services/evaluation.service';
import { AgentPole } from '../interfaces';

@Component({
  selector: 'app-rapport-pole',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule],
  templateUrl: './rapport-pole.component.html',
  styleUrl: './rapport-pole.component.scss',
})
export class RapportPoleComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<AgentPole>([]);
  colonnes = ['agent', 'nb_echecs', 'transactions_critiques', 'mois', 'motifs'];

  ngOnInit(): void {
    this.srv.getRapportAgentsPole().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger le rapport'),
    });
  }

  exporter() {
    const data = this.dataSource.data.map(a => ({
      Nom: a.nom,
      Prenom: a.prenom,
      Login: a.login_genesys,
      'Nb echecs': a.nb_echecs,
      'Transactions critiques': a.transactions_critiques,
      Mois: a.mois.join(', '),
      Motifs: a.motifs.join(' | '),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agents en pole');
    XLSX.writeFile(wb, `Agents_en_pole_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
