import { NgModule, Optional, NgZone, InjectionToken, ModuleWithProviders, APP_INITIALIZER, Injector } from '@angular/core';
import { Analytics as FirebaseAnalytics, isSupported } from 'firebase/analytics';
import { ɵgetDefaultInstanceOf, ɵAngularFireSchedulers, VERSION } from '@angular/fire';
import { Analytics, ANALYTICS_PROVIDER_NAME, AnalyticsInstances } from './analytics';
import { FirebaseApps, FirebaseApp } from '@angular/fire/app';
import { registerVersion } from 'firebase/app';
import { ScreenTrackingService } from './screen-tracking.service';
import { UserTrackingService } from './user-tracking.service';

const PROVIDED_ANALYTICS_INSTANCES = new InjectionToken<Analytics[]>('angularfire2.analytics-instances');
const IS_SUPPORTED = new InjectionToken<boolean>('angularfire2.analytics.isSupported');

const isSupportedSymbol = Symbol('angularfire2.analytics.isSupported');

export function defaultAnalyticsInstanceFactory(isSupported: boolean, provided: FirebaseAnalytics[]|undefined, defaultApp: FirebaseApp) {
  if (!isSupported) { return null; }
  const defaultAnalytics = ɵgetDefaultInstanceOf<FirebaseAnalytics>(ANALYTICS_PROVIDER_NAME, provided, defaultApp);
  return defaultAnalytics && new Analytics(defaultAnalytics);
}

export function analyticsInstanceFactory(fn: (injector: Injector) => FirebaseAnalytics) {
  return (zone: NgZone, isSupported: boolean, injector: Injector) => {
    if (!isSupported) { return null; }
    const analytics = zone.runOutsideAngular(() => fn(injector));
    return new Analytics(analytics);
  };
}

const ANALYTICS_INSTANCES_PROVIDER = {
  provide: AnalyticsInstances,
  deps: [
    [new Optional(), PROVIDED_ANALYTICS_INSTANCES ],
  ]
};

const DEFAULT_ANALYTICS_INSTANCE_PROVIDER = {
  provide: Analytics,
  useFactory: defaultAnalyticsInstanceFactory,
  deps: [
    IS_SUPPORTED,
    [new Optional(), PROVIDED_ANALYTICS_INSTANCES ],
    FirebaseApp,
  ]
};

@NgModule({
  providers: [
    DEFAULT_ANALYTICS_INSTANCE_PROVIDER,
    ANALYTICS_INSTANCES_PROVIDER,
    {
      provide: APP_INITIALIZER,
      useValue: () => isSupported().then(it => globalThis[isSupportedSymbol] = it),
      multi: true,
    },
  ]
})
export class AnalyticsModule {
  constructor(
    @Optional() _screenTracking: ScreenTrackingService,
    @Optional() _userTracking: UserTrackingService,
  ) {
    registerVersion('angularfire', VERSION.full, 'analytics');
  }
}

export function provideAnalytics(fn: (injector: Injector) => FirebaseAnalytics, ...deps: any[]): ModuleWithProviders<AnalyticsModule> {
  return {
    ngModule: AnalyticsModule,
    providers: [{
      provide: IS_SUPPORTED,
      useFactory: () => globalThis[isSupportedSymbol],
    }, {
      provide: PROVIDED_ANALYTICS_INSTANCES,
      useFactory: analyticsInstanceFactory(fn),
      multi: true,
      deps: [
        NgZone,
        IS_SUPPORTED,
        Injector,
        ɵAngularFireSchedulers,
        FirebaseApps,
        ...deps,
      ]
    }]
  };
}
