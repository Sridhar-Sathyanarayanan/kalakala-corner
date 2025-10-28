import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { NgxSpinnerService } from "ngx-spinner";
import { Product } from "../models/app.model";
import { AppService } from "../services/app.service";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { MessageModalComponent } from "../shared/message/message-modal.component";

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
  imports: [MaterialStandaloneModules],
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  copied = false;
  productsList = [];
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private productService: ProductService,
    private appService: AppService,
    private dialog: MatDialog,
    private spinner: NgxSpinnerService
  ) {
    this.contactForm = this.fb.group({
      name: ["", [Validators.required, Validators.minLength(2)]],
      phone: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ["", [Validators.required, Validators.email]],
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
    this.appService.sendMail(this.contactForm.value).subscribe({
      next: () => {
        this.spinner.hide();
        this.contactForm.reset();
        this.contactForm.setValue({
          name: "",
          phone: "",
          queryType: "general",
          product: "",
          query: "",
          email: "",
        });
        Object.keys(this.contactForm.controls).forEach((key) => {
          this.contactForm.get(key)?.markAsUntouched();
          this.contactForm.get(key)?.markAsPristine();
          this.contactForm.get(key)?.updateValueAndValidity();
        });
        this.dialog.open(MessageModalComponent, {
          data: {
            message:
              "Email sent successfully. We will get back to you shortly.",
          },
          width: "90vw",
          maxWidth: "500px",
        });
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
