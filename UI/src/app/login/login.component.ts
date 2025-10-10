import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { AppService } from "../services/app.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialStandaloneModules],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {
  username: string = "";
  password: string = "";
  hidePassword: boolean = true;
  constructor(private appService: AppService) {}
  login() {
    if (!this.username || !this.password) {
      alert("Please enter both username and password.");
      return;
    }
    this.appService.login(this.username, this.password).subscribe((res) => {
      sessionStorage.setItem("jwtToken", res.token);
    });
  }
}
