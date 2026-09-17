import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ChatWidgetComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  title = 'WorldDance';

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Rutas como login/register marcan `data: { hideChrome: true }` para ocultar navbar y footer. */
  readonly hideChrome = signal(this.getDeepestRouteData()['hideChrome'] === true);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.getDeepestRouteData()['hideChrome'] === true),
      takeUntilDestroyed()
    ).subscribe(hide => this.hideChrome.set(hide));
  }

  private getDeepestRouteData(): Record<string, unknown> {
    let route = this.route.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data;
  }
}