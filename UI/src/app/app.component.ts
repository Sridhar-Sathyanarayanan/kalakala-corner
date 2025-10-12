import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MaterialStandaloneModules } from "./shared/material-standalone";
import { AppService } from "./services/app.service";
import { LoggedIn } from "./models/app.model";
import { MatSnackBar } from "@angular/material/snack-bar";

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
  constructor(public appService: AppService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.appService.checkLoggedIn().subscribe((res: LoggedIn) => {
      this.appService.isLoggedIn$.next(res.loggedIn);
    });
    this.appService.isLoggedIn$.subscribe((status) => {
      this.admin = status;
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  logout() {
    this.appService.logout().subscribe(() => {
      this.snackBar.open("Logged out successfully", null, {
        duration: 3000,
      });
      this.appService.isLoggedIn$.next(false);
    });
  }
}
