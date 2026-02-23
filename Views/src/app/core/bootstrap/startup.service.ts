import { Injectable, inject } from '@angular/core';
import { AuthService, User } from '@core/authentication';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { switchMap, tap } from 'rxjs';
import { Menu, MenuService } from './menu.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly permissonsService = inject(NgxPermissionsService);
  private readonly rolesService = inject(NgxRolesService);

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
    this.menuService.addNamespace(menu, 'menu');
    this.menuService.set(menu);
  }

  private setPermissions(user: User) {
    console.log(user);
    // In a real app, you should get permissions and roles from the user information. , 'canDelete', 'canEdit', 'canRead'
    const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    // permissionsOfRole: Record<string, string[]> ={ADMIN:[""]};
    this.permissonsService.loadPermissions(permissions);
    this.rolesService.flushRoles();
    if (user.roles === 'R_GB') {
      this.rolesService.addRoles({ R_GB: permissions });
    } else {
      if (user.roles === 'R_SUP') {
        this.rolesService.addRoles({ R_SUP: permissions });
      } else {
        if (user.roles === 'R_RO') {
          this.rolesService.addRoles({ R_RO: permissions });
        } else {
          if (user.roles === 'R_RO') {
            this.rolesService.addRoles({ R_ROO: permissions });
          } else {
            if (user.roles === 'R_TC') {
              this.rolesService.addRoles({ R_TC: permissions });
            } else {
              if (user.roles === 'R_ADMI') {
                this.rolesService.addRoles({ R_ADMI: permissions });
              } else {
                if (user.roles === 'R_AQ') {
                  this.rolesService.addRoles({ R_AQ: permissions });
                } else {
                  if (user.roles === 'R_AF') {
                    this.rolesService.addRoles({ R_AF: permissions });
                  } else {
                    if (user.roles === 'R_GE') {
                      this.rolesService.addRoles({ R_GE: permissions });
                    } else {
                      if (user.role === 'R_RO') {
                        this.rolesService.addRoles({ R_RO: permissions });
                      } else {
                        if (user.role === 'R_GE') {
                          this.rolesService.addRoles({ R_GE: permissions });
                        } else {
                          if (user.role === 'R_TC') {
                            this.rolesService.addRoles({ R_TC: permissions });
                          } else {
                            if (user.role === 'R_BO') {
                              this.rolesService.addRoles({ R_TC: permissions });
                            } else {
                              this.rolesService.addRoles({ R_TC: permissions });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
