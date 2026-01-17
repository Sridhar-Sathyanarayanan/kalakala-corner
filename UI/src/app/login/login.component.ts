import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { AppService } from "../services/app.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { NgxSpinnerService } from "ngx-spinner";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialStandaloneModules],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  username: string = "";
  password: string = "";
  hidePassword: boolean = true;
  error = false;
  constructor(
    private appService: AppService,
    private snackBar: MatSnackBar,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {}
  login() {
    if (!this.username || !this.password) {
      alert("Please enter both username and password.");
      return;
    }
    this.spinner.show();
    this.appService.login(this.username, this.password).subscribe({
      next: () => {
        this.spinner.hide();
        this.error = false;
        this.appService.isLoggedIn$.next(true);
        this.snackBar.open("Logged in successfully", null, {
          duration: 3000,
        });
        this.router.navigate(["/admin"]);
      },
      error: () => {
        this.spinner.hide();
        this.error = true;
      },
    });
  }
}
