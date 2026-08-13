import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';

@Component({
  selector: 'app-import-agents-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatDialogClose, MtxButtonModule],
  templateUrl: './import-agents-dialog.component.html',
})
export class ImportAgentsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ImportAgentsDialogComponent>);
  private readonly srv = inject(EvaluationService);
  private readonly toast = inject(ToastrService);

  fichier: File | null = null;
  isSubmitting = false;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fichier = input.files && input.files.length ? input.files[0] : null;
  }

  importer() {
    if (!this.fichier) {
      this.toast.warning('Selectionnez un fichier Excel');
      return;
    }
    const fd = new FormData();
    fd.append('file', this.fichier);
    this.isSubmitting = true;
    this.srv.importAgents(fd).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.toast.error("Echec de l'import Excel");
        this.isSubmitting = false;
      },
    });
  }
}
