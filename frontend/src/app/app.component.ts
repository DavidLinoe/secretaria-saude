import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeedbackComponent } from './shared/feedback.component';

interface BottomNavItem {
  icon: string;
  label: string;
  route: string;
}

/**
 * Sem auth/welcome/bottom-bar do monorepo original (`app-navigation`,
 * ligado a login Google + JWT do `core`) — o backend deste MVP é público,
 * então a navegação aqui é só um bottom nav simples e local.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, FeedbackComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly navItems: BottomNavItem[] = [
    { icon: 'pi-home', label: 'Início', route: '/home' },
    { icon: 'pi-check-square', label: 'Conferir', route: '/conferencia' },
    { icon: 'pi-box', label: 'Estoque', route: '/estoque' },
    { icon: 'pi-file-pdf', label: 'Documentos', route: '/documentos' },
    { icon: 'pi-camera', label: 'Escanear', route: '/escanear' },
  ];
}
