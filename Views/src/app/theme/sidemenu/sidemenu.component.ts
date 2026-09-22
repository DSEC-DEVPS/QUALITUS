import { animate, state, style, transition, trigger } from '@angular/animations';
import { AsyncPipe, NgTemplateOutlet, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { MenuService } from '@core';
import { PermissionsService } from '../../core/authorization/permissions.service';
import { NavAccordionItemDirective } from './nav-accordion-item.directive';
import { NavAccordionToggleDirective } from './nav-accordion-toggle.directive';
import { NavAccordionDirective } from './nav-accordion.directive';
import { map } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrl: './sidemenu.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    AsyncPipe,
    SlicePipe,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    NgxPermissionsModule,
    MatIconModule,
    MatRippleModule,
    TranslateModule,
    NavAccordionDirective,
    NavAccordionItemDirective,
    NavAccordionToggleDirective,
    MatDividerModule,
  ],
  animations: [
    trigger('expansion', [
      state('collapsed, void', style({ height: '0px', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: '' })),
      transition(
        'expanded <=> collapsed, void => collapsed',
        animate('225ms cubic-bezier(0.4,0,0.2,1)')
      ),
    ]),
  ],
})
export class SidemenuComponent implements OnInit {
  // The ripple effect makes page flashing on mobile
  @Input() ripple = false;

  private readonly menu = inject(MenuService);
  private readonly perms = inject(PermissionsService);

  menu$ = this.menu.getAll();

  ngOnInit(): void {
    this.menu$.pipe(map(value => console.log(value))).subscribe();
  }
  buildRoute = this.menu.buildRoute;

  /**
   * Un menu/sous-menu n'est visible que si l'utilisateur possède au moins une
   * permission du module associé (champ `module`). Sans `module`, on ne restreint
   * pas (audience gérée par les rôles via ngxPermissionsOnly).
   */
  canModule = (module?: string): boolean => (!module ? true : this.perms.canModule(module));
}
