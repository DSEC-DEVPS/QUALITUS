import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  AppearanceAnimation,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';
import { EvaluationService } from '@shared/services/evaluation.service';
import { AgentEvalue } from '../interfaces';
import { AgentDialogComponent, AgentDialogData } from './agent-dialog.component';
import { ImportAgentsDialogComponent } from './import-agents-dialog.component';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.scss',
})
export class AgentsComponent implements OnInit {
  private readonly srv = inject(EvaluationService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);

  dataSource = new MatTableDataSource<AgentEvalue>([]);
  colonnes = ['id', 'nom', 'prenom', 'login_genesys', 'type_nom', 'site_nom', 'Etat', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  charger() {
    this.srv.getAgents().subscribe({
      next: d => (this.dataSource.data = d),
      error: () => this.toast.error('Impossible de charger les agents'),
    });
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  private ouvrir(mode: 'add' | 'edit', agent?: AgentEvalue) {
    const data: AgentDialogData = { mode, agent };
    return this.dialog.open(AgentDialogComponent, { width: '640px', data }).afterClosed();
  }

  ajouter() {
    this.ouvrir('add').subscribe((r: Partial<AgentEvalue> | undefined) => {
      if (r) {
        this.srv.addAgent(r).subscribe({
          next: () => { this.toast.success('Agent ajoute'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  modifier(a: AgentEvalue) {
    this.ouvrir('edit', a).subscribe((r: Partial<AgentEvalue> | undefined) => {
      if (r) {
        this.srv.updateAgent(a.id, r).subscribe({
          next: () => { this.toast.success('Agent modifie'); this.charger(); },
          error: () => this.toast.error("Une erreur s'est produite"),
        });
      }
    });
  }

  importer() {
    this.dialog
      .open(ImportAgentsDialogComponent, { width: '520px' })
      .afterClosed()
      .subscribe(done => {
        if (done) {
          this.charger();
        }
      });
  }

  supprimer(a: AgentEvalue) {
    const box = new ConfirmBoxInitializer();
    box.setTitle('Suppression !');
    box.setMessage(`Supprimer l'agent "${a.nom} ${a.prenom || ''}" ?`);
    box.setConfig({
      layoutType: DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.BOUNCE_IN,
      animationOut: DisappearanceAnimation.BOUNCE_OUT,
      buttonPosition: 'right',
    });
    box.setButtonLabels('OUI', 'NON');
    box.openConfirmBox$().subscribe(resp => {
      if (resp.success) {
        this.srv.deleteAgent(a.id).subscribe({
          next: r => { this.toast.success(r.message); this.charger(); },
          error: () => this.toast.error('Suppression impossible'),
        });
      }
    });
  }
}
