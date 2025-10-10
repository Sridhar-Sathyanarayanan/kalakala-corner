import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MaterialStandaloneModules } from './shared/material-standalone';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MaterialStandaloneModules],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  mobileMenuOpen = false;

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
