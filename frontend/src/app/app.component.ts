import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface BottomNavItem {
  icon: string;
  label: string;
  route: string;
}

/**
 * Sem auth/welcome/bottom-bar do monorepo original (`app-navigation`,
 * ligado a login Google + JWT do `core`) — o backend deste MVP é público,
 * então a navegação aqui é só um bottom nav simples e local. Bipar/Estoque/
 * Perfil aparecem pra mostrar a IA completa do produto mas ainda roteiam
 * pra Home — não existem containers reais ainda (ver README).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly navItems: BottomNavItem[] = [
    { icon: 'pi-home', label: 'Início', route: '/home' },
    { icon: 'pi-camera', label: 'Escanear', route: '/escanear' },
    { icon: 'pi-qrcode', label: 'Bipar', route: '/bipar' },
    { icon: 'pi-box', label: 'Estoque', route: '/estoque' },
    { icon: 'pi-user', label: 'Perfil', route: '/perfil' },
  ];
}
