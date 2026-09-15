import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionsService } from './permissions.service';

/**
 * *appCan="'evaluation.creer'"            → affiché si l'utilisateur a la permission
 * *appCan="['evaluation.creer','...']"    → affiché s'il a AU MOINS une des permissions
 * Réactif : se réévalue quand les permissions sont (re)chargées.
 */
@Directive({ selector: '[appCan]', standalone: true })
export class CanDirective implements OnDestroy {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly perms = inject(PermissionsService);

  private code: string | string[] | null = null;
  private shown = false;
  private readonly sub: Subscription;

  constructor() {
    this.sub = this.perms.permissions$.subscribe(() => this.render());
  }

  @Input() set appCan(code: string | string[]) {
    this.code = code;
    this.render();
  }

  private render(): void {
    const ok = this.code == null
      ? false
      : Array.isArray(this.code) ? this.perms.canAny(this.code) : this.perms.can(this.code);
    if (ok && !this.shown) { this.vcr.createEmbeddedView(this.tpl); this.shown = true; }
    else if (!ok && this.shown) { this.vcr.clear(); this.shown = false; }
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
