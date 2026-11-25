import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import * as ExcelJS from 'exceljs';

/**
 * Import de comptes en masse depuis un fichier Excel.
 * 1. « Télécharger le modèle » : classeur généré avec les valeurs autorisées
 *    (fonctions, sites, programmes, grilles, superviseurs de votre périmètre) en
 *    listes déroulantes ;
 * 2. dépôt du fichier rempli -> vérification ligne par ligne (rien n'est créé) ;
 * 3. « Créer les N comptes valides » -> les lignes en erreur sont ignorées et
 *    peuvent être téléchargées (avec la colonne Erreur) pour correction.
 */

interface Referentiels {
  fonctions: { id: number; nom: string }[];
  sites: { id: number; nom: string }[];
  programmes: { id: number; nom: string }[];
  grilles: { id: number; nom: string }[];
  superviseurs: { id: number; nom_utilisateur: string; nom: string; prenom: string; id_Site: number }[];
}
interface LigneImport {
  ligne: number;
  nom: string;
  prenom: string;
  nom_utilisateur: string;
  email: string;
  telephone: string;
  genre: string;
  ville: string;
  adresse: string;
  fonction: string;
  site: string;
  programme: string;
  grille: string;
  superviseur: string;
}
interface Resultat {
  ligne: number;
  login: string;
  nom: string;
  prenom: string;
  statut: 'OK' | 'ERREUR' | 'CREE';
  erreurs: string[];
}

/** Colonnes du modèle : en-tête affiché -> champ envoyé au serveur. */
const COLONNES: { titre: string; champ: keyof LigneImport; largeur: number }[] = [
  { titre: 'Nom *', champ: 'nom', largeur: 18 },
  { titre: 'Prénom *', champ: 'prenom', largeur: 18 },
  { titre: 'Login *', champ: 'nom_utilisateur', largeur: 18 },
  { titre: 'E-mail *', champ: 'email', largeur: 28 },
  { titre: 'Téléphone *', champ: 'telephone', largeur: 15 },
  { titre: 'Genre *', champ: 'genre', largeur: 10 },
  { titre: 'Ville', champ: 'ville', largeur: 15 },
  { titre: 'Adresse', champ: 'adresse', largeur: 22 },
  { titre: 'Fonction *', champ: 'fonction', largeur: 24 },
  { titre: 'Site *', champ: 'site', largeur: 22 },
  { titre: 'Programme *', champ: 'programme', largeur: 14 },
  { titre: "Grille d'évaluation", champ: 'grille', largeur: 24 },
  { titre: 'Superviseur (login)', champ: 'superviseur', largeur: 20 },
];
const MAX_LIGNES = 500;
const FEUILLE = 'Utilisateurs';
const sansAccent = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*\s]/g, '').toLowerCase();

@Component({
  selector: 'app-import-utilisateurs',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './import-utilisateurs.component.html',
  styleUrl: './import-utilisateurs.component.scss',
})
export class ImportUtilisateursComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastrService);
  readonly dialogRef = inject(MatDialogRef<ImportUtilisateursComponent>);

  enCours = false;
  nomFichier = '';
  lignes: LigneImport[] = [];
  resultats: Resultat[] = [];
  etape: 'depot' | 'verifie' | 'cree' = 'depot';
  resume = { total: 0, valides: 0, erreurs: 0, crees: 0 };
  filtreErreurs = false;
  creeUnCompte = false;

  get affichees(): Resultat[] {
    return this.filtreErreurs ? this.resultats.filter(r => r.statut === 'ERREUR') : this.resultats;
  }

  // ---------------------------------------------------------------------
  // 1. Modèle
  // ---------------------------------------------------------------------
  telechargerModele() {
    this.enCours = true;
    this.http.get<Referentiels>('/api/v1/utilisateur-creation/referentiels').subscribe({
      next: async refs => {
        try {
          await this.genererModele(refs, [], 'modele_import_utilisateurs.xlsx');
        } finally {
          this.enCours = false;
        }
      },
      error: e => {
        this.enCours = false;
        this.toast.error(e?.error?.message || 'Impossible de préparer le modèle.');
      },
    });
  }

  /** Classeur : onglet Utilisateurs (listes déroulantes), Listes (valeurs autorisées), Mode d'emploi. */
  private async genererModele(refs: Referentiels, lignes: (LigneImport & { erreur?: string })[], nom: string) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(FEUILLE, { views: [{ state: 'frozen', ySplit: 1 }] });
    const avecErreur = lignes.some(l => l.erreur);
    const cols = [...COLONNES.map(c => ({ header: c.titre, key: c.champ as string, width: c.largeur }))];
    if (avecErreur) cols.push({ header: 'Erreur (ignorée à l’import)', key: 'erreur', width: 60 });
    ws.columns = cols;
    const entete = ws.getRow(1);
    entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF7900' } };
    entete.height = 20;
    lignes.forEach(l => ws.addRow(l));
    // Téléphone en texte (zéros en tête conservés)
    ws.getColumn('telephone').numFmt = '@';

    const listes = wb.addWorksheet('Listes');
    const colonnesListes: [string, string[]][] = [
      ['Genre', ['Homme', 'Femme']],
      ['Fonctions', refs.fonctions.map(f => f.nom)],
      ['Sites', refs.sites.map(s => s.nom)],
      ['Programmes', refs.programmes.map(p => String(p.nom))],
      ["Grilles d'évaluation", refs.grilles.map(g => g.nom)],
      ['Superviseurs (login)', refs.superviseurs.map(s => s.nom_utilisateur)],
      [
        'Superviseur : nom et site',
        refs.superviseurs.map(
          s => `${s.nom_utilisateur} — ${s.prenom || ''} ${s.nom || ''} (${refs.sites.find(x => x.id === s.id_Site)?.nom || ''})`
        ),
      ],
    ];
    colonnesListes.forEach(([titre, valeurs], i) => {
      const col = listes.getColumn(i + 1);
      col.width = Math.max(18, ...valeurs.map(v => String(v).length + 2));
      listes.getCell(1, i + 1).value = titre;
      listes.getCell(1, i + 1).font = { bold: true };
      valeurs.forEach((v, j) => (listes.getCell(j + 2, i + 1).value = v));
    });
    const plage = (i: number, n: number) => {
      const lettre = String.fromCharCode(65 + i);
      return `Listes!$${lettre}$2:$${lettre}$${Math.max(2, n + 1)}`;
    };
    const validations: [keyof LigneImport, number][] = [
      ['genre', 0],
      ['fonction', 1],
      ['site', 2],
      ['programme', 3],
      ['grille', 4],
      ['superviseur', 5],
    ];
    for (const [champ, i] of validations) {
      const n = colonnesListes[i][1].length;
      if (!n) continue;
      const lettre = ws.getColumn(champ as string).letter;
      for (let r = 2; r <= MAX_LIGNES + 1; r++) {
        ws.getCell(`${lettre}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [plage(i, n)],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Valeur non autorisée',
          error: 'Choisissez une valeur de la liste (onglet « Listes »).',
        };
      }
    }
    listes.state = 'visible';

    const aide = wb.addWorksheet("Mode d'emploi");
    aide.getColumn(1).width = 110;
    [
      'IMPORT DE COMPTES UTILISATEUR',
      '',
      `1. Remplissez l'onglet « ${FEUILLE} » : une ligne par compte, à partir de la ligne 2, ${MAX_LIGNES} lignes au maximum.`,
      '2. Ne modifiez pas les en-têtes. Les colonnes marquées * sont obligatoires.',
      '3. Genre, Fonction, Site, Programme, Grille et Superviseur : choisissez dans la liste déroulante',
      '   (valeurs de l’onglet « Listes », limitées à ce que vous avez le droit de créer).',
      '4. Login sans espace, unique ; e-mail unique. Superviseur : login d’un superviseur actif du même site (facultatif).',
      '5. Dans l’application : Utilisateurs > Importer > déposez le fichier. Rien n’est créé à la vérification.',
      '6. « Créer les comptes valides » crée les lignes correctes ; les lignes en erreur sont ignorées.',
      '   Téléchargez-les (colonne « Erreur »), corrigez-les et réimportez ce fichier.',
      '7. Mot de passe initial : <login>Orange<année> (ex. adiopOrange2026), à changer à la première connexion.',
      '   Chaque nouveau compte reçoit les fiches actives qui le concernent.',
      '',
      'Exemple de ligne :',
      'Diop | Awa | adiop | awa.diop@exemple.sn | 770000000 | Femme | Dakar | Liberté 6 | Tele Conseiller | <site> | <programme> | | <login superviseur>',
    ].forEach((t, i) => {
      aide.getCell(i + 1, 1).value = t;
      if (i === 0) aide.getCell(1, 1).font = { bold: true, size: 14 };
    });
    wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];
    const buf = await wb.xlsx.writeBuffer();
    this.telecharger(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom);
  }

  private telecharger(blob: Blob, nom: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------------
  // 2. Lecture du fichier et vérification
  // ---------------------------------------------------------------------
  async choisirFichier(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      this.toast.error('Déposez un fichier Excel .xlsx (le modèle téléchargé).');
      return;
    }
    this.nomFichier = f.name;
    this.etape = 'depot';
    this.resultats = [];
    try {
      this.lignes = await this.lire(await f.arrayBuffer());
    } catch (e: any) {
      this.lignes = [];
      this.toast.error(e?.message || 'Fichier illisible.');
      return;
    }
    if (!this.lignes.length) {
      this.toast.warning('Aucune ligne remplie dans le fichier.');
      return;
    }
    if (this.lignes.length > MAX_LIGNES) {
      this.toast.error(`Le fichier contient ${this.lignes.length} lignes : ${MAX_LIGNES} au maximum par import.`);
      this.lignes = [];
      return;
    }
    this.verifier();
  }

  private async lire(buffer: ArrayBuffer): Promise<LigneImport[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet(FEUILLE) || wb.worksheets[0];
    if (!ws) throw new Error('Le fichier ne contient aucune feuille.');
    // Colonnes repérées par leur en-tête (ordre libre, accents / * / espaces ignorés)
    const index = new Map<keyof LigneImport, number>();
    ws.getRow(1).eachCell((cell, n) => {
      const t = sansAccent(cell.text || '');
      const c = COLONNES.find(x => sansAccent(x.titre) === t || sansAccent(x.champ) === t);
      if (c && !index.has(c.champ)) index.set(c.champ, n);
    });
    const manquantes = COLONNES.filter(c => c.titre.includes('*') && !index.has(c.champ)).map(c => c.titre.replace(' *', ''));
    if (manquantes.length) {
      throw new Error(`Colonnes absentes : ${manquantes.join(', ')}. Utilisez le modèle téléchargeable.`);
    }
    const lignes: LigneImport[] = [];
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (n === 1) return;
      const l: any = { ligne: n };
      let rempli = false;
      for (const c of COLONNES) {
        const i = index.get(c.champ);
        const v = i ? (row.getCell(i).text || '').trim() : '';
        l[c.champ] = v;
        if (v) rempli = true;
      }
      if (rempli) lignes.push(l);
    });
    return lignes;
  }

  verifier() {
    this.enCours = true;
    this.http.post<{ total: number; valides: number; lignes: Resultat[] }>('/api/v1/utilisateur-import/verifier', { lignes: this.lignes }).subscribe({
      next: r => {
        this.enCours = false;
        this.resultats = r.lignes;
        this.resume = { total: r.total, valides: r.valides, erreurs: r.total - r.valides, crees: 0 };
        this.filtreErreurs = this.resume.erreurs > 0;
        this.etape = 'verifie';
      },
      error: e => {
        this.enCours = false;
        this.toast.error(e?.error?.message || 'La vérification a échoué.');
      },
    });
  }

  // ---------------------------------------------------------------------
  // 3. Création
  // ---------------------------------------------------------------------
  creer() {
    if (!this.resume.valides) return;
    this.enCours = true;
    this.http
      .post<{ total: number; crees: number; refusees: number; lignes: Resultat[] }>('/api/v1/utilisateur-import/creer', { lignes: this.lignes })
      .subscribe({
        next: r => {
          this.enCours = false;
          this.resultats = r.lignes;
          this.resume = { total: r.total, valides: r.crees, erreurs: r.refusees, crees: r.crees };
          this.etape = 'cree';
          this.creeUnCompte = this.creeUnCompte || r.crees > 0;
          this.filtreErreurs = false;
          this.toast.success(`${r.crees} compte(s) créé(s)` + (r.refusees ? `, ${r.refusees} ligne(s) refusée(s).` : '.'));
        },
        error: e => {
          this.enCours = false;
          this.toast.error(e?.error?.message || 'La création a échoué : aucun compte créé.');
        },
      });
  }

  /** Lignes refusées, au format du modèle + colonne Erreur, pour correction puis réimport. */
  telechargerRefusees() {
    const enErreur = new Map(this.resultats.filter(r => r.statut === 'ERREUR').map(r => [r.ligne, r.erreurs.join(' ; ')]));
    const lignes = this.lignes.filter(l => enErreur.has(l.ligne)).map(l => ({ ...l, erreur: enErreur.get(l.ligne) }));
    if (!lignes.length) return;
    this.enCours = true;
    this.http.get<Referentiels>('/api/v1/utilisateur-creation/referentiels').subscribe({
      next: async refs => {
        try {
          await this.genererModele(refs, lignes, 'lignes_refusees_import_utilisateurs.xlsx');
        } finally {
          this.enCours = false;
        }
      },
      error: e => {
        this.enCours = false;
        this.toast.error(e?.error?.message || 'Impossible de préparer le fichier.');
      },
    });
  }

  fermer() {
    this.dialogRef.close(this.creeUnCompte);
  }
}
