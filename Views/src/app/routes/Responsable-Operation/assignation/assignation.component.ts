import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/**
 * @title Chips Autocomplete
 */
@Component({
  selector: 'app-assignation',
  standalone: true,
  templateUrl: './assignation.component.html',
  styleUrl: './assignation.component.scss',
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    CommonModule,
    MatCardModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignationComponent implements OnInit {
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly taostSrv = inject(ToastrService);
  private readonly router = inject(Router);
  readonly currentFruit = model('');
  id_SUPERVISEUR!: number;
  fruits = signal<string[]>(['Lemon']);
  allSuperviseur!: any[];
  // readonly allFruits: string[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];
  data_form!: FormGroup;
  allFruits: string[] = [];
  filteredFruits!: any;
  readonly announcer = inject(LiveAnnouncer);
  ngOnInit(): void {
    this.data_form = this.fb.group({
      id_SUPERVISEUR: [null, [Validators.required]],
    });
    this.userService.getAllAgentByRo_Assignable().subscribe({
      next: resultat => {
        this.fruits = signal<string[]>([resultat[0]]);
        this.allFruits = resultat;
        this.filteredFruits = computed(() => {
          const currentFruit = this.currentFruit();
          return currentFruit
            ? this.allFruits.filter(fruit => fruit.includes(currentFruit))
            : this.allFruits.slice();
        });
      },
      error: error => {
        console.log(error);
      },
    });
    this.userService.getAllSuperviseurByRo().subscribe({
      next: resultat => {
        this.allSuperviseur = resultat;
      },
      error: error => {
        console.log(error);
      },
    });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.fruits.update(fruits => [...fruits, value]);
    }

    // Clear the input value
    this.currentFruit.set('');
  }
  remove(fruit: string): void {
    this.fruits.update(fruits => {
      const index = fruits.indexOf(fruit);
      if (index < 0) {
        return fruits;
      }

      fruits.splice(index, 1);
      this.announcer.announce(`Removed ${fruit}`);
      return [...fruits];
    });
  }
  selected(event: MatAutocompleteSelectedEvent): void {
    this.fruits.update(fruits => [...fruits, event.option.viewValue]);
    this.currentFruit.set('');
    event.option.deselect();
  }
  onSubmit() {
    if (this.id_SUPERVISEUR === null) {
      this.taostSrv.error('Merci de selectionner un superviseur!!');
    } else {
      this.userService
        .assigne_agent({
          id_SUPERVISEUR: this.id_SUPERVISEUR,
          liste_agents: this.fruits(),
        })
        .subscribe({
          next: resultat => {
            this.taostSrv.success(resultat.message);
            this.router.navigateByUrl('mon-espace/RO/assignation-agents');
          },
          error: error => {
            console.log(error);
          },
        });
    }
  }
  isSubmitDisabled(): boolean {
    const hasAgents = this.fruits().length > 0;
    const hasSupervisor = this.id_SUPERVISEUR && this.id_SUPERVISEUR !== null;
    const isFormValid = this.data_form?.valid || false;

    return !(hasAgents && hasSupervisor && isFormValid);
  }
}
