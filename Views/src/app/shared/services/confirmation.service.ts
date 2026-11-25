import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AppearanceAnimation,
  ButtonLayoutDisplay,
  ButtonMaker,
  ConfirmBoxInitializer,
  DialogLayoutDisplay,
  DisappearanceAnimation,
} from '@costlydeveloper/ngx-awesome-popup';

/** danger : suppression / action définitive ; attention : action importante ; info : simple information. */
export type TypeConfirmation = 'danger' | 'attention' | 'info';

export interface OptionsConfirmation {
  titre: string;
  message: string;
  type?: TypeConfirmation;
  oui?: string;
  non?: string;
}

/**
 * Boîte de confirmation de l'application (ngx-awesome-popup), à la place du
 * confirm() du navigateur. Renvoie true si l'utilisateur confirme.
 *
 *   if (!(await this.confirmation.confirmer({ titre: 'Supprimer', message: '…' }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  async confirmer(o: OptionsConfirmation): Promise<boolean> {
    const boite = new ConfirmBoxInitializer();
    boite.setTitle(o.titre);
    boite.setMessage(o.message);
    boite.setConfig({
      layoutType:
        o.type === 'info' ? DialogLayoutDisplay.INFO
        : o.type === 'attention' ? DialogLayoutDisplay.WARNING
        : DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
      buttonPosition: 'right',
    });
    boite.setButtonLabels(o.oui || 'Oui', o.non || 'Annuler');
    try {
      const r = await firstValueFrom(boite.openConfirmBox$());
      return !!(r && r.success);
    } catch {
      return false;
    }
  }

  /**
   * Boîte à plusieurs choix : renvoie l'identifiant du bouton cliqué, ou null si la
   * boîte est fermée sans choix (Échap, clic à l'extérieur).
   *   const c = await this.confirmation.choisir({ titre, message, choix: [{ id: 'a', libelle: 'A' }, …] });
   */
  async choisir(o: { titre: string; message: string; type?: TypeConfirmation;
                     choix: { id: string; libelle: string; principal?: boolean }[] }): Promise<string | null> {
    const boite = new ConfirmBoxInitializer();
    boite.setTitle(o.titre);
    boite.setMessage(o.message);
    boite.setConfig({
      layoutType:
        o.type === 'info' ? DialogLayoutDisplay.INFO
        : o.type === 'attention' ? DialogLayoutDisplay.WARNING
        : DialogLayoutDisplay.DANGER,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
      buttonPosition: 'right',
    });
    boite.setButtons(o.choix.map(c => new ButtonMaker(c.libelle, c.id,
      c.principal ? ButtonLayoutDisplay.PRIMARY : ButtonLayoutDisplay.SECONDARY)));
    try {
      const r: any = await firstValueFrom(boite.openConfirmBox$());
      return r?.clickedButtonID || null;
    } catch {
      return null;
    }
  }
}
