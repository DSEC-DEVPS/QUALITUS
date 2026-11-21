import { TestBed } from '@angular/core/testing';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { of } from 'rxjs';
import { AuthService } from '@core/authentication';
import { MenuService } from '@core/bootstrap/menu.service';
import { MENU } from '@core/bootstrap/menu-data';
import { StartupService } from '@core/bootstrap/startup.service';
import { PermissionsService } from '@core/authorization/permissions.service';

describe('StartupService', () => {
  const permissions = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
  let utilisateur: any;
  let menuServeur: any[];
  let ngxPerms: jasmine.SpyObj<NgxPermissionsService>;
  let ngxRoles: jasmine.SpyObj<NgxRolesService>;
  let menu: jasmine.SpyObj<MenuService>;
  let perms: jasmine.SpyObj<PermissionsService>;
  let startup: StartupService;

  beforeEach(() => {
    utilisateur = { id: 1, roles: 'R_SUP' };
    menuServeur = [];
    ngxPerms = jasmine.createSpyObj('NgxPermissionsService', ['loadPermissions']);
    ngxRoles = jasmine.createSpyObj('NgxRolesService', ['flushRoles', 'addRoles']);
    menu = jasmine.createSpyObj('MenuService', ['set']);
    perms = jasmine.createSpyObj('PermissionsService', ['load']);
    perms.load.and.returnValue(of(undefined) as any);
    TestBed.configureTestingModule({
      providers: [
        StartupService,
        { provide: AuthService, useValue: { change: () => of(utilisateur), menu: () => of(menuServeur) } },
        { provide: NgxPermissionsService, useValue: ngxPerms },
        { provide: NgxRolesService, useValue: ngxRoles },
        { provide: MenuService, useValue: menu },
        { provide: PermissionsService, useValue: perms },
      ],
    });
    startup = TestBed.inject(StartupService);
  });

  it('charge les permissions, le rôle de l\'utilisateur et les permissions fines', async () => {
    await startup.load();
    expect(ngxPerms.loadPermissions).toHaveBeenCalledWith(permissions);
    expect(ngxRoles.flushRoles).toHaveBeenCalled();
    expect(ngxRoles.addRoles).toHaveBeenCalledWith({ R_SUP: permissions });
    expect(perms.load).toHaveBeenCalled();
  });

  it('reprend le rôle tel quel (plus de repli « R_TC » pour un profil non listé)', async () => {
    utilisateur = { id: 2, roles: 'R_BO' };
    await startup.load();
    expect(ngxRoles.addRoles).toHaveBeenCalledWith({ R_BO: permissions });
    expect(ngxRoles.addRoles).not.toHaveBeenCalledWith({ R_TC: permissions });
  });

  it('n\'ajoute aucun rôle pour un visiteur non connecté', async () => {
    utilisateur = {};
    await startup.load();
    expect(ngxRoles.flushRoles).toHaveBeenCalled();
    expect(ngxRoles.addRoles).not.toHaveBeenCalled();
  });

  it('utilise le menu statique quand le serveur n\'en fournit pas', async () => {
    await startup.load();
    expect(menu.set).toHaveBeenCalledWith(MENU);
  });

  it('utilise le menu du serveur s\'il en fournit un', async () => {
    menuServeur = [{ route: 'x', name: 'X', type: 'link', icon: 'home' }];
    await startup.load();
    expect(menu.set).toHaveBeenCalledWith(menuServeur as any);
  });
});
