export * from './menu.service';
export * from './settings.service';
export * from './startup.service';
export * from './preloader.service';

import { APP_INITIALIZER } from '@angular/core';
import { StartupService } from './startup.service';

/*export function TranslateLangServiceFactory(translateLangService: TranslateLangService) {
  return () => translateLangService.load();
}*/

export function StartupServiceFactory(startupService: StartupService) {
  return () => startupService.load();
}

export const appInitializerProviders = [
  {
    provide: APP_INITIALIZER,
    useFactory: StartupServiceFactory,
    deps: [StartupService],
    multi: true,
  },
];
