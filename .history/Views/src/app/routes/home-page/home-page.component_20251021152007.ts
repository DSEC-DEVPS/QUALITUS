import {
  Component,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
  inject,
  ViewEncapsulation,
  OnInit,
  ChangeDetectorRef,
  Inject,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { debounceTime, Observable, Subscription } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule, DatePipe } from '@angular/common';
import {
  AppSettings,
  AuthService,
  CategorieInterface,
  Fiche,
  fiche_id_categorie_and_id_sous_cateogorie,
  LoginService,
  SettingsService,
  statistic,
  statistic_TC,
  User,
} from '@core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationComponent } from '@theme/widgets/notification.component';
import { Router } from '@angular/router';
import { UserService } from '@shared/services/user.service';
import screenfull from 'screenfull';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CustomizerComponent } from '@theme/customizer/customizer.component';
import { MatCardModule } from '@angular/material/card';
import { MatNavList } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserComponent } from '@theme/widgets/user.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { UppercaseAllPipe } from '../../shared/pipes/UppercaseAllPipe';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-home-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe],
  imports: [
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    NotificationComponent,
    MatFormFieldModule,
    CustomizerComponent,
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    UserComponent,
    MatDialogModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    FormsModule,
    MatRadioModule,
    UppercaseAllPipe,
    MatCheckboxModule,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements AfterViewInit, OnInit {
  dataSource: MatTableDataSource<Fiche> = new MatTableDataSource<Fiche>([]);

  dataSource_Archive!: MatTableDataSource<Fiche>;
  private subscription: Subscription = new Subscription();
  displayedColumns: string[] = ['titre', 'type', 'dateDebut', 'dateFin', 'Gestionnaire'];
  displayedColumns_Archive: string[] = [
    'titre',
    'type',
    'dateDebut',
    'dateFin',
    'ETAT',
    'Gestionnaire',
  ];
  displayedColumns_table: string[] = ['titre', 'type'];
  data!: MatTableDataSource<Fiche>;
  data_table!: MatTableDataSource<fiche_id_categorie_and_id_sous_cateogorie>;
  resultsLength = 0;
  resultsLength_table = 0;
  isLoadingResults = true;
  isRateLimitReached = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator_table!: MatPaginator;
  @ViewChild(MatSort) sort_table!: MatSort;
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly userInfoService = inject(LoginService);
  private readonly datePipe = inject(DatePipe);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialog = inject(MatDialog);
  dateForm!: FormGroup;
  options = this.settings.options;
  isShowValue!: boolean;
  isShowValueSearchAvance!: boolean;
  isShowValueSearchArchive!: boolean;
  isShowValueSousCategorie!: boolean;
  isShowValueSousCategorieDiv!: boolean;
  isShowTableValueVariable!: boolean;
  isShowCategorie!: boolean;
  stateTransition = false;
  activeCategorieId: number | null = null;
  div_table = 'col-md-10 p-3';
  div_cat_nb_col = 'col-md-8';
  div_cat_img_col = 'col-md-2 col-sm-4';
  div_sous_cat_nb_col = '';
  categorieAndSousCategorie!: CategorieInterface[];
  sous_categorie!: CategorieInterface[];
  logo_Orange = 'img/Orange_logo.png';
  imageOrangeLogo = 'img/Orange_logo.png';
  folder = 'img/folder2.png';
  folder2 = 'img/folder.png';
  tableau_extention: string[] = ['img/file.png', 'img/xls.png', 'img/doc.png'];
  user!: User;
  statitic!: statistic;
  nb_fiche_non_lu = 0;
  nb_sondage_encours = 0;
  nb_quiz_encours = 0;
  statistic_TC!: statistic_TC | null;
  todayDate!: string | null;
  fiches$!: Observable<Fiche[]>;
  selectedNiveau: string | null = null;
  user_info: any;
  showDefaut = false;
  currentStateOfIdSubCatAndCat = {
    id: 0,
    id_categorie: 0,
  };
  ngOnInit(): void {
    console.log('Selected niveau', this.selectedNiveau);
    this.initObservable();
    this.userService.getFicheFromServer();
    this.isShowValue = false;
    this.isShowValueSearchAvance = true;
    this.isShowValueSearchArchive = false;
    this.isShowValueSousCategorie = false;
    this.isShowValueSousCategorieDiv = false;
    this.isShowCategorie = false;
    this.isShowTableValueVariable = false;
    this.dateForm = new FormGroup({
      selectedDate: new FormControl(new Date()),
    });
    this.todayDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd');
    this.auth.user().subscribe({
      next: user => {
        this.user = user;
        console.log(user);
        if (user.roles === 'R_ADMI' || user.roles === 'R_GB' || user.roles === 'R_SUPE') {
          this.div_table = 'col-md-12 p-3';
        } else {
          this.div_table = 'col-md-10 p-3';
        }
      },
      error: error => {
        console.log(error);
      },
    });
    // Observer les changements de la date et envoyer la requête
    this.subscription.add(
      this.dateForm
        .get('selectedDate')
        ?.valueChanges.pipe(debounceTime(300))
        .subscribe(date => {
          if (date) {
            this.sendDateRequest(date);
          }
        })
    );

    this.userService.statistic_TC(this.todayDate || '3000-01-01').subscribe({
      next: resultat => {
        this.statistic_TC = resultat;
      },
      error: error => {
        console.log(error);
      },
    });

    this.userService.getAllFiche_Archive().subscribe({
      next: resultat => {
        this.dataSource_Archive = new MatTableDataSource(resultat);
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllCategorieWithTheirSousCategorie().subscribe({
      next: categorie => {
        this.categorieAndSousCategorie = categorie;
      },
    });
    this.userService.statistic().subscribe({
      next: resultat => {
        this.statitic = resultat;
        this.nb_fiche_non_lu = resultat.fiche_non_lu.length;
        this.nb_quiz_encours = resultat.Quiz_encours.length;
        this.nb_sondage_encours = resultat.sondage_encours.length;
      },
      error: error => {
        console.log(error);
      },
    });
    this.userInfoService.me().subscribe({
      next: resultat => {
        this.user_info = resultat;
        console.log(this.user_info);
        if (this.user_info?.roles === 'R_TC') {
          this.selectedNiveau = '1';
        } else if (this.user_info?.roles === 'R_BO') {
          this.selectedNiveau = '2';
        } else {
          this.selectedNiveau = null;
          this.showDefaut = true;
        }

        this.getAllFiche();
      },
    });
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  private initObservable() {
    this.fiches$ = this.userService.fiches$;
    console.log(this.fiches$);
  }
  getFormattedDate(date: Date): string {
    date = this.dateForm.get('selectedDate')?.value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sendDateRequest(date: Date): void {
    // Formatage de la date au format yyyy-MM-dd
    const formattedDate = this.getFormattedDate(date);
    // Exemple d'envoi de requête HTTP
    this.userService.statistic_TC(formattedDate).subscribe({
      next: resultat => {
        this.statistic_TC = resultat;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  openDialog_Quiz_encours() {
    if (this.nb_quiz_encours === 0) {
      console.log('rien');
    } else {
      const dialogRef = this.dialog.open(Quiz_Encours_DialogComponent, {
        height: 'calc(100% - 30px)',
        width: 'calc(100% - 30px)',
        maxWidth: '95%',
        maxHeight: '95%',
      });
    }
  }
  openDialog_Lire_toutes_les_fiche() {
    console.log('Selected niveau before entering dialog:', this.selectedNiveau);

    const dialogRef = this.dialog.open(LiretouteficheComponent, {
      height: 'calc(100% - 30px)',
      width: 'calc(100% - 30px)',
      maxWidth: '100%',
      maxHeight: '100%',
      data: {
        selectedNiveau: this.selectedNiveau, // Passer la valeur actuelle
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }

  openDialog_Sondages_encours() {
    if (this.nb_sondage_encours === 0) {
      console.log('rien');
    } else {
      const dialogRef = this.dialog.open(Sondages_Encours_DialogComponent, {
        height: 'calc(100% - 30px)',
        width: 'calc(100% - 30px)',
        maxWidth: '95%',
        maxHeight: '95%',
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log(`Dialog result: ${result}`);
      });
    }
  }
  openDialog_Fiche_non_lu() {
    if (this.nb_fiche_non_lu === 0) {
      console.log('rien');
    } else {
      // Passez directement les données que vous m'avez montrées
      const fiches_non_lues = this.statitic.fiche_non_lu;
      const dialogRef = this.dialog.open(Fiche_non_lu_DialogComponent, {
        height: 'calc(100% - 30px)',
        width: 'calc(100% - 30px)',
        maxWidth: '95%',
        maxHeight: '95%',
      });
      dialogRef.afterClosed().subscribe(result => {
        console.log(`Dialog result: ${result}`);
      });
    }
  }
  checked_N1(event: any) {
    if (event.checked) {
      console.log('N1 checked');
    }
  }
  checked_N2(event: any) {
    if (event.checked) {
      console.log('N2 checked');
    }
  }
  RouterOnWorkSpace() {
    if (this.user.roles === 'R_TC') {
      this.router.navigateByUrl('mon-espace/MaVoixCompte/ajouter');
    } else {
      if (this.user.roles === 'R_GE') {
        this.router.navigateByUrl('mon-espace/Fiche/ge-chargement');
      } else {
        if (this.user.roles === 'R_RO') {
          this.router.navigateByUrl('mon-espace/RO/renitialisation-password');
        } else {
          if (this.user.roles === 'R_SUP') {
            this.router.navigateByUrl('mon-espace/mes-agents/Liste');
          } else {
            this.router.navigateByUrl('mon-espace');
          }
        }
      }
    }
  }

  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }
  dispalay_fiche(id: number) {
    this.router.navigate([`lecture-fiche/${id}`], {
      state: { returnToHomePage: true },
    });
  }
  updateOptions(options: AppSettings) {
    this.options = options;
    this.settings.setOptions(options);
    this.settings.setDirection();
    this.settings.setTheme();
  }
  onNiveauChange(selected: string) {
    this.selectedNiveau = selected;
    console.log('Niveau sélectionné:', this.selectedNiveau);
    if (
      this.currentStateOfIdSubCatAndCat.id !== 0 &&
      this.currentStateOfIdSubCatAndCat.id_categorie !== 0 &&
      this.isShowTableValueVariable
    ) {
      this.isShowTableValue(
        this.currentStateOfIdSubCatAndCat.id,
        this.currentStateOfIdSubCatAndCat.id_categorie
      );
    }
    this.getAllFiche();
  }

  getAllFiche() {
    this.userService.getAllFiche().subscribe({
      next: resultat => {
        const result = new MatTableDataSource(resultat);
        let filteredData: any = [];
        if (this.selectedNiveau) {
          if (this.selectedNiveau === '1') {
            filteredData = result.data.filter(fiche => fiche?.Niveau === '1');
            console.log('Step 1', filteredData);
          } else if (this.selectedNiveau === '2') {
            filteredData = result.data.filter(fiche => fiche?.Niveau === '2');
            console.log('Step 2', filteredData);
          } else if (this.selectedNiveau === 'reset') {
            filteredData = result.data;
            console.log('Step 3', filteredData);
          }
        } else {
          filteredData = result.data;
        }

        this.dataSource = new MatTableDataSource(filteredData);
        this.cdr.detectChanges();
      },
      error: error => console.error(error),
    });
  }

  isShow(type: string) {
    if (type === 'SearchByCategory') {
      this.isShowValueSearchAvance = true;
      this.isShowValueSearchArchive = false;
      this.isShowValue = !this.isShowValue;
      this.activeCategorieId = null;
      if (this.stateTransition) {
        this.isShowValueSousCategorieDiv = false;
        this.stateTransition = false;
        this.isShowCategorie = false;
        this.isShowValue = false;
        console.log('if testtttttt', this.isShowCategorie);
        console.log('if testtttttt isShowValue', this.isShowValue);
      } else {
        this.isShowCategorie = !this.isShowCategorie;
        console.log('else testtttttt', this.isShowCategorie);
        console.log('esle testtttttt isShowValue', this.isShowValue);
      }
      // console.log(' search categorie this.isShowCategorie', this.isShowCategorie);
    } else {
      if (type === 'SearchAvance') {
        this.isShowValueSearchArchive = false;
        this.isShowCategorie = false;
        this.isShowValue = false;
        this.isShowValueSousCategorieDiv = false;
        this.isShowValueSearchAvance = true;
        this.activeCategorieId = null;
      } else {
        if (type === 'SearchArchive') {
          this.isShowValueSearchAvance = false;
          this.isShowValue = false;
          this.isShowValueSousCategorieDiv = false;
          this.isShowCategorie = false;
          this.isShowValueSearchArchive = true;
          this.activeCategorieId = null;
        }
      }
    }
  }
  isShowSousCategorie(id: number) {
    this.isShowCategorie = false;
    this.stateTransition = true;
    this.isShowValueSousCategorieDiv = true;
    this.isShowValueSousCategorie = true;
    this.isShowTableValueVariable = false;
    this.sous_categorie = this.categorieAndSousCategorie.filter(cat => cat.id === id);
    this.activeCategorieId = id;
    console.log(' sous categorie this.isShowCategorie', this.isShowCategorie);
  }
  isShowTableValue(id: number, id_categorie: number) {
    this.currentStateOfIdSubCatAndCat.id = id;
    this.currentStateOfIdSubCatAndCat.id_categorie = id_categorie;
    this.userService
      .getAllFicheByIdCategorieAndIdSousCategorie({
        id_SousCategorie: id,
        id_Categorie: id_categorie,
      })
      .subscribe({
        next: resultat => {
          let filteredData: any = [];
          if (this.selectedNiveau) {
            if (this.selectedNiveau === '1') {
              filteredData = resultat.filter(fiche => fiche?.Niveau === '1');
              console.log('Step 1', filteredData);
            } else if (this.selectedNiveau === '2') {
              filteredData = resultat.filter(fiche => fiche?.Niveau === '2');
              console.log('Step 2', filteredData);
            } else if (this.selectedNiveau === 'reset') {
              filteredData = resultat;
              console.log('Step 3', filteredData);
            }
          } else {
            filteredData = resultat;
          }
          this.data_table = new MatTableDataSource(filteredData);
          this.data_table.paginator = this.paginator_table;
          this.data_table.sort = this.sort_table;
          this.div_cat_nb_col = 'col-md-6';
          this.div_cat_img_col = 'col-md-3 col-sm-4';
          this.isShowTableValueVariable = true;
          this.cdr.detectChanges();
        },
      });
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.data.paginator) {
      this.data.paginator.firstPage();
    }
  }
  applyFilter_Archive(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource_Archive.filter = filterValue.trim().toLowerCase();

    if (this.dataSource_Archive.paginator) {
      this.dataSource_Archive.paginator.firstPage();
    }
  }
  applyFilter_par_categorie(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.data_table.filter = filterValue.trim().toLowerCase();

    if (this.data_table.paginator) {
      this.data_table.paginator.firstPage();
    }
  }
}

/** An example database that the data source uses to retrieve data for the table. */

@Component({
  selector: 'app-Quiz_Encours_Dialog',
  templateUrl: 'Quiz_Encours_Dialog.component.html',
  styleUrl: './home-page.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatDividerModule,
    DatePipe,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quiz_Encours_DialogComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<Quiz_Encours_DialogComponent>);
  table_quiz_encours!: MatTableDataSource<Fiche>;
  displayedColumns: string[] = ['titre', 'type', 'dateDebut', 'dateFin', 'Gestionnaire'];
  lenghtFiche = 0;
  ngOnInit() {
    this.userService.statistic().subscribe({
      next: resultat => {
        console.log(resultat);
        this.lenghtFiche = resultat.Quiz_encours.length;
        this.table_quiz_encours = new MatTableDataSource(resultat.Quiz_encours);
        this.cdr.detectChanges();
      },
      error: error => {
        console.log(error);
        this.cdr.detectChanges();
      },
    });
  }
  lire(id: number) {
    this.dialogRef.close();
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}
@Component({
  selector: 'app-Sondages_Encours_Dialog',
  templateUrl: 'Sondages_Encours_Dialog.component.html',
  styleUrl: './home-page.component.scss',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sondages_Encours_DialogComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<Sondages_Encours_DialogComponent>);
  table_sondages_encours!: MatTableDataSource<Fiche>;
  displayedColumns: string[] = ['titre', 'type', 'dateDebut', 'dateFin', 'Gestionnaire'];
  lenghtFiche = 0;
  ngOnInit() {
    this.userService.statistic().subscribe({
      next: resultat => {
        console.log(resultat);
        this.lenghtFiche = resultat.sondage_encours.length;
        this.table_sondages_encours = new MatTableDataSource(resultat.sondage_encours);
        this.cdr.detectChanges();
      },
      error: error => {
        console.log(error);
        this.cdr.detectChanges();
      },
    });
  }
  lire(id: number) {
    this.dialogRef.close();
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}
@Component({
  selector: 'app-fiche_non_lu.component',
  templateUrl: 'fiche_non_lu.component.html',
  styleUrl: './home-page.component.scss',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    MatCardModule,
    MatNavList,
    MatDividerModule,
    DatePipe,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fiche_non_lu_DialogComponent {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<Fiche_non_lu_DialogComponent>);
  table_fiche_non_lu_encours!: MatTableDataSource<Fiche>;
  displayedColumns: string[] = ['titre', 'type', 'dateDebut', 'dateFin', 'Gestionnaire'];
  lenghtFiche = 0;
  ngOnInit() {
    this.userService.statistic().subscribe({
      next: resultat => {
        console.log(resultat);
        this.lenghtFiche = resultat.fiche_non_lu.length;
        this.table_fiche_non_lu_encours = new MatTableDataSource(resultat.fiche_non_lu);
        this.cdr.detectChanges();
      },
      error: error => {
        console.log(error);
        this.cdr.detectChanges();
      },
    });
  }
  lire(id: number) {
    this.dialogRef.close();
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}
@Component({
  selector: 'app-lire-toutes',
  templateUrl: 'lire-toutes-fiche.component.html',
  styleUrl: './home-page.component.scss',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    UppercaseAllPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiretouteficheComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly userInfoService = inject(LoginService);
  readonly dialogRef = inject(MatDialogRef<LiretouteficheComponent>);

  table_toutes_fiche!: MatTableDataSource<Fiche>;
  displayedColumns: string[] = ['titre', 'type', 'dateDebut', 'dateFin', 'Gestionnaire'];
  lenghtFiche = 0;
  selectedNiveau: string | null = null;
  user_info: any;
  constructor(
    // ...
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  ngOnInit() {
    // this.userService.getAllFiche().subscribe({
    //   next: resultat => {
    //     console.log(resultat);
    //     this.lenghtFiche = resultat.length;
    //     this.table_toutes_fiche = new MatTableDataSource(resultat);
    //     this.cdr.detectChanges();
    //   },
    //   error: error => {
    //     console.log(error);
    //     this.cdr.detectChanges();
    //   },
    // });
    this.userInfoService.me().subscribe({
      next: resultat => {
        this.user_info = resultat;
        console.log(this.user_info);
        if (this.user_info?.roles === 'R_TC') {
          this.selectedNiveau = this.data?.selectedNiveau || '1';
        } else if (this.user_info?.roles === 'R_BO') {
          this.selectedNiveau = this.data?.selectedNiveau || '2';
        } else {
          this.selectedNiveau = this.data?.selectedNiveau || 'reset';
        }
        console.log('Selected niveau', this.selectedNiveau);
        this.getAllFiche();
      },
    });
  }

  getAllFiche() {
    this.userService.getAllFiche().subscribe({
      next: resultat => {
        const result = new MatTableDataSource(resultat);
        let filteredData: any = [];

        if (this.selectedNiveau) {
          if (this.selectedNiveau === '1') {
            filteredData = result.data.filter(fiche => fiche?.Niveau === '1');
            console.log('Step 1', filteredData);
          } else if (this.selectedNiveau === '2') {
            filteredData = result.data.filter(fiche => fiche?.Niveau === '2');
            console.log('Step 2', filteredData);
          } else if (this.selectedNiveau === 'reset') {
            filteredData = result.data;
            console.log('Step 3', filteredData);
          }
        } else {
          filteredData = result.data;
        }

        this.table_toutes_fiche = new MatTableDataSource(filteredData);
        this.lenghtFiche = filteredData.length;
        this.cdr.detectChanges();
      },
      error: error => console.error(error),
    });
  }
  lire(id: number) {
    this.dialogRef.close();
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}
