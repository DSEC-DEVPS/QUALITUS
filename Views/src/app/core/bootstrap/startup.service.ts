import { Injectable, inject } from '@angular/core';
import { AuthService, User } from '@core/authentication';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { switchMap, tap } from 'rxjs';
import { Menu, MenuService } from './menu.service';
import { MENU } from './menu-data';
import { PermissionsService } from '../authorization/permissions.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly permissonsService = inject(NgxPermissionsService);
  private readonly rolesService = inject(NgxRolesService);
  private readonly permissionsService = inject(PermissionsService);

  /**
   * Load the application only after get the menu or other essential informations
   * such as permissions and roles.
   */
  load() {
    console.log('loading');
    return new Promise<void>((resolve, reject) => {
      this.authService
        .change()
        .pipe(
          tap(user => {
            this.setPermissions(user), console.log(user);
          }),
          switchMap(() => this.permissionsService.load()),
          switchMap(() => this.authService.menu()),
          tap(menu => this.setMenu(menu))
        )
        .subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
    });
  }

  private setMenu(menu: Menu[]) {
    // Le backend n'expose pas de menu (/me/menu) : on charge le menu statique.
    // `menu` (issu de authService.menu()) est ignoré tant qu'il est vide.
    const menuData = menu && menu.length > 0 ? menu : MENU;
    this.menuService.set(menuData);
  }

  private setPermissions(user: User) {
    // Permissions « legacy » et rôle de l'utilisateur pour ngx-permissions (menu.json :
    // permissions.only / except). Le rôle est repris tel quel (R_ADMI, R_GB, R_SUP,
    // R_TC, R_BO…) : plus de rôle de repli « R_TC » pour les profils non listés.
    const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.permissonsService.loadPermissions(permissions);
    this.rolesService.flushRoles();
    const role = String((user as any)?.roles || (user as any)?.role || '').trim();
    if (role) {
      this.rolesService.addRoles({ [role]: permissions });
    }
  }
}
