import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { NgxSpinnerService } from "ngx-spinner";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";
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
  productsList: any[] = [];
  categoriesList = [];
  allProducts = [];
  filteredProducts$!: Observable<any[]>;
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
      category: [""],
      product: [""],
      query: ["", [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    // Load categories
    this.productService.getCategories().subscribe((data: any) => {
      this.categoriesList = data.items || [];
    });

    // Load all products
    this.productService.getProducts("all").subscribe((data: Product) => {
      this.allProducts = data.items || [];
    });

    // Disable product field initially
    this.contactForm.get("product")?.disable();

    // Setup autocomplete filtering
    this.filteredProducts$ = this.contactForm.get("product")!.valueChanges.pipe(
      startWith(""),
      map((value) => this._filterProducts(value))
    );

    // Dynamically require product and category if "product" query type is chosen
    this.contactForm.get("queryType")?.valueChanges.subscribe((type) => {
      const productCtrl = this.contactForm.get("product");
      const categoryCtrl = this.contactForm.get("category");
      if (type === "product") {
        categoryCtrl?.addValidators([Validators.required]);
        productCtrl?.addValidators([Validators.required]);
      } else {
        categoryCtrl?.clearValidators();
        productCtrl?.clearValidators();
        categoryCtrl?.setValue("");
        productCtrl?.setValue("");
        productCtrl?.disable();
        this.productsList = [];
      }
      categoryCtrl?.updateValueAndValidity();
      productCtrl?.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.contactForm.invalid) {
      return;
    }
    this.spinner.show();
    this.appService.submitCustomerEnquiry(this.contactForm.value).subscribe({
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

  onCategoryChange(): void {
    const selectedCategory = this.contactForm.get("category")?.value;
    const productCtrl = this.contactForm.get("product");
    
    if (selectedCategory) {
      // Enable product field and load products from API for the selected category
      productCtrl?.enable();
      this.productService.getProducts(selectedCategory).subscribe((data: Product) => {
        this.productsList = data.items || [];
        // Reset product selection and trigger autocomplete update
        productCtrl?.setValue("");
      });
    } else {
      // Disable product field and clear products list
      productCtrl?.disable();
      this.productsList = [];
      productCtrl?.setValue("");
    }
  }

  private _filterProducts(value: any): any[] {
    if (!value || typeof value !== 'string') {
      return this.productsList;
    }
    const filterValue = value.toLowerCase();
    return this.productsList.filter((product) =>
      product.name.toLowerCase().includes(filterValue) ||
      (product.desc && product.desc.toLowerCase().includes(filterValue))
    );
  }
}
