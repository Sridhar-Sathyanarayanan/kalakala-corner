import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { NgxSpinnerService } from "ngx-spinner";
import { personalDetails, Product } from "../models/app.model";
import { AppService } from "../services/app.service";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { MessageModalComponent } from "../shared/message/message-modal.component";

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrl: "./contact.component.scss",
  imports: [MaterialStandaloneModules],
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  productsList = [];
  personalDetails = personalDetails;
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private productService: ProductService,
    private appService: AppService,
    private dialog: MatDialog,
    private spinner: NgxSpinnerService,
    private router: Router,
    private breakpointObserver: BreakpointObserver
  ) {
    this.contactForm = this.fb.group({
      name: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
        ],
      ],
      phone: [
        "",
        [Validators.required, Validators.pattern(/^\+?[0-9\s\-().]{7,20}$/)],
      ],
      email: ["", [Validators.email]],
      queryType: ["general", Validators.required],
      product: [""],
      query: ["", [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.productService.getProducts("").subscribe((data: Product) => {
      data.items.forEach((item) => {
        this.productsList.push(item.name);
      });
    });
    // Dynamically require product if "product" query type is chosen
    this.contactForm.get("queryType")?.valueChanges.subscribe((type) => {
      const productCtrl = this.contactForm.get("product");
      if (type === "product") {
        productCtrl?.addValidators([Validators.required]);
      } else {
        productCtrl?.clearValidators();
        productCtrl?.setValue("");
      }
      productCtrl?.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.contactForm.invalid) {
      return;
    }
    this.spinner.show();
    this.appService.sendEmail(this.contactForm.value).subscribe({
      next: () => {
        this.spinner.hide();
        const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
        this.dialog.open(MessageModalComponent, {
          data: {
            message:
              "Notification has been successfully sent to the admin. We’ll respond to you shortly.",
          },
          width: isMobile ? "90%" : "55%",
          maxWidth: "95vw",
        });
        this.contactForm.reset({ queryType: "general" });
        this.contactForm.markAsUntouched();
      },
      error: () => {
        this.spinner.hide();
        this.snackBar.open(
          "Something went wrong. Please try again later.",
          "Close",
          { duration: 3000 }
        );
      },
    });
  }
}
