import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MaterialStandaloneModules } from "./shared/material-standalone";
import { AppService } from "./services/app.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterModule, MaterialStandaloneModules],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  mobileMenuOpen = false;
  admin = false;
  constructor(private appService: AppService) {}

  ngOnInit(): void {
    this.appService.checkLoggedIn().subscribe(() => {
      this.appService.isLoggedIn$.next(true);
    });
    this.appService.isLoggedIn$.subscribe((status) => {
      this.admin = status;
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  logout() {
    this.appService.logout().subscribe((res) => {
      this.appService.isLoggedIn$.next(false);
    });
  }
}
