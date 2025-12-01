import { Component, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MaterialStandaloneModules } from "./shared/material-standalone";
import { AppService } from "./services/app.service";
import { emojis, LoggedIn } from "./models/app.model";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmationModalComponent } from "./shared/confirmation/confirmation-modal.component";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { ProductService } from "./services/product.service";

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
  menuItems = [];

  constructor(
    public appService: AppService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.appService.checkLoggedIn().subscribe((res: LoggedIn) => {
      this.appService.isLoggedIn$.next(res.loggedIn);
    });
    this.appService.isLoggedIn$.subscribe((status) => {
      this.admin = status;
    });
    this.productService.getCategories().subscribe((data) => {
      this.menuItems = data.items.map((item, index) => ({
        ...item,
        icon: emojis[index % emojis.length],
      }));
      this.menuItems.unshift({ name: "All Products", path: "all", icon: "🔥" });
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  logout(event: Event) {
    event.preventDefault();
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message: "Are you sure you want to logout?",
        button: "Yes",
      },
      width: isMobile ? "90%" : "55%",
      maxWidth: "95vw",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.appService.logout().subscribe(() => {
          this.snackBar.open("Logged out successfully", null, {
            duration: 3000,
          });
          this.appService.isLoggedIn$.next(false);
        });
      }
    });
  }
  navigateTo(route: string) {
    this.router.navigateByUrl(route);
    this.mobileMenuOpen = false;
  }
}
