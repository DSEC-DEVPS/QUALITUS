/*
import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, AfterViewInit, inject, Input, OnInit } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { merge, Observable, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { Fiche } from '@core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-material-table-template',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTableModule, MatSortModule, MatPaginatorModule, DatePipe],
  templateUrl: './material-table-template.component.html',
  styleUrl: './material-table-template.component.scss',
})
export class MaterialTableTemplateComponent implements OnInit {
  displayedColumns: string[] = [
    'titre',
    'type',
    'priorite',
    'dateDebut',
    'dateFin',
    'Gestionnaire',
  ];
  @Input() data!: MatTableDataSource<Fiche>;

  resultsLength = 0;
  private readonly router = inject(Router);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  ngOnInit(): void {
    this.data.sort = this.sort;
    this.data.paginator = this.paginator;
  }
  dispalay_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}


import {HttpClient} from '@angular/common/http';
import {Component, ViewChild, AfterViewInit, inject} from '@angular/core';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule, SortDirection} from '@angular/material/sort';
import {merge, Observable, of as observableOf} from 'rxjs';
import {catchError, map, startWith, switchMap} from 'rxjs/operators';
import {MatTableModule} from '@angular/material/table';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {DatePipe} from '@angular/common';

/**
 * @title Table retrieving data through HTTP
 */
/*
@Component({
  selector: 'app-material-table-template',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTableModule, MatSortModule, MatPaginatorModule, DatePipe],
  templateUrl: './material-table-template.component.html',
  styleUrl: './material-table-template.component.scss',
})
export class MaterialTableTemplateComponent implements  AfterViewInit {
  private _httpClient = inject(HttpClient);
  displayedColumns: string[] = [
    'titre',
    'type',
    'priorite',
    'dateDebut',
    'dateFin',
    'Gestionnaire',
  ];
  exampleDatabase!: Fiche | null;
  @Input() data!: MatTableDataSource<Fiche>;

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.data.sort = this.sort;
    this.data.paginator = this.paginator;
  }
  dispalay_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }

  ngAfterViewInit() {
    this.exampleDatabase = this.data;

    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getRepoIssues(
            this.sort.active,
            this.sort.direction,
            this.paginator.pageIndex,
          ).pipe(catchError(() => observableOf(null)));
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          // Only refresh the result length if there is new data. In case of rate
          // limit errors, we do not want to reset the paginator to zero, as that
          // would prevent users from re-triggering requests.
          this.resultsLength = data.total_count;
          return data.items;
        }),
      )
      .subscribe(data => (this.data = data));
  }
}
*/

import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, AfterViewInit, inject, input, Input, OnInit } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { merge, Observable, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Fiche } from '@core';
import { Router } from '@angular/router';
import { UserService } from '@shared/services/user.service';

/**
 * @title Table retrieving data through HTTP
 */
@Component({
  selector: 'app-material-table-template',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    DatePipe,
    TitleCasePipe,
  ],
  templateUrl: './material-table-template.component.html',
  styleUrl: './material-table-template.component.scss',
})
export class MaterialTableTemplateComponent implements OnInit {
  private _httpClient = inject(HttpClient);
  private userService = inject(UserService);
  tableau_extention: string[] = ['img/file.png', 'img/xls.png', 'img/doc.png'];
  displayedColumns: string[] = [
    'titre',
    'type',
    'dateDebut',
    'dateFin',
    'Gestionnaire',
    'extention',
  ];
  datasource!: MatTableDataSource<Fiche>;
  exampleDatabase!: ExampleHttpDatabase | null;

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  private readonly router = inject(Router);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @Input() dataa!: Fiche[];

  ngOnInit() {
    this.userService.getAllFiche().subscribe({
      next: fiches => {
        this.resultsLength = fiches.length;
        this.datasource = new MatTableDataSource(fiches);
      },
      error: error => {
        console.log(error);
      },
    });
    //this.exampleDatabase = new ExampleHttpDatabase(this._httpClient);

    // If the user changes the sort order, reset back to the first page.
    // this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    /* merge(this.paginator.page)
      .pipe(
        // startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getRepoIssues().pipe(catchError(() => observableOf(null)));
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          // Only refresh the result length if there is new data. In case of rate
          // limit errors, we do not want to reset the paginator to zero, as that
          // would prevent users from re-triggering requests.
          this.resultsLength = data.length;
          console.log(data);
          return data;
        })
      )
      .subscribe(data => (this.data = data));
      */
  }
  ngAfterViewInit() {
    this.datasource.paginator = this.paginator;
  }
  dispalay_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}

export interface GithubApi {
  items: Fiche[];
  total_count: number;
}

export interface GithubIssue {
  created_at: string;
  number: string;
  state: string;
  title: string;
}

/** An example database that the data source uses to retrieve data for the table. */
export class ExampleHttpDatabase {
  constructor(private _httpClient: HttpClient) {}

  getRepoIssues(): Observable<Fiche[]> {
    const href = 'http://localhost:8080/api/v1/fiche/all';
    return this._httpClient.get<Fiche[]>(href);
  }
}
