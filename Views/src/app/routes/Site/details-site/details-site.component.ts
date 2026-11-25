import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '@shared/services/user.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import {
  MembreReferentiel,
  MembresReferentielComponent,
} from '@shared/components/membres-referentiel/membres-referentiel.component';
import { finalize } from 'rxjs';

/** Détail d'un site : informations + utilisateurs rattachés (recherche, filtres, export). */
@Component({
  selector: 'app-details-site',
  standalone: true,
  imports: [ChargementComponent, MatButtonModule, MatIconModule, MembresReferentielComponent],
  templateUrl: './details-site.component.html',
  styleUrl: './details-site.component.scss',
})
export class DetailsSiteComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  chargement = true;
  infos: { nom: string; Etat?: string; dateCreation?: string; description?: string | null } | null = null;
  membres: MembreReferentiel[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.userService
      .getDetailsSiteById(id)
      .pipe(finalize(() => (this.chargement = false)))
      .subscribe({
        next: r => {
          this.infos = (r?.infos_site || [])[0] || null;
          this.membres = r?.utilisateurs || [];
        },
        error: () => {},
      });
  }

  goBack(): void {
    this.location.back();
  }
}
