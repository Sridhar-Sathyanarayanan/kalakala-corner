import { Component, OnInit, signal, inject } from "@angular/core";
import { Customerenquiry, Testimonial } from "../models/app.model";
import { CustomerEnquiriesService } from "../services/customer-enquiries.service";
import { TestimonialsService } from "../services/testimonials.service";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { Router } from "@angular/router";
import { AppService } from "../services/app.service";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ConfirmationModalComponent } from "../shared/confirmation/confirmation-modal.component";

@Component({
  selector: "app-admin",
  templateUrl: "./admin.component.html",
  styleUrl: "./admin.component.scss",
  imports: [MaterialStandaloneModules],
})
export class AdminComponent implements OnInit {
  displayedColumns: string[] = [
    "date",
    "name",
    "email",
    "phone",
    "product",
    "query",
  ];

  testimonialColumns: string[] = [
    "id",
    "category",
    "product",
    "customerName",
    "comments",
    "rating",
    "updatedAt",
    "actions",
  ];

  // Signals for reactive state management (Angular 21 best practice)
  enquiries = signal<Customerenquiry[]>([]);
  testimonials = signal<Testimonial[]>([]);
  categories = signal<any[]>([]);
  allProducts = signal<any[]>([]);
  filteredProducts = signal<any[]>([]);

  // testimonial form
  testimonialForm = signal({
    category: "",
    product: "",
    "product-id": "",
    comments: "",
    rating: 0,
    customerName: "",
  });

  editingTestimonial = signal<Testimonial | null>(null);
  isEditMode = signal<boolean>(false);

  // Helper getters/setters for ngModel compatibility
  get form() {
    return this.testimonialForm();
  }

  updateFormField(field: string, value: any): void {
    this.testimonialForm.set({
      ...this.testimonialForm(),
      [field]: value,
    });
  }

  constructor(
    private customerEnquiries: CustomerEnquiriesService,
    private testimonialsService: TestimonialsService,
    private productService: ProductService,
    private appService: AppService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Check login
    this.appService.isLoggedIn$.subscribe((status) => {
      if (!status) this.router.navigate(["/login"]);
    });

    this.loadEnquiries();
    this.loadTestimonials();
    this.loadCategories();
    this.loadAllProducts();
  }

  loadEnquiries(): void {
    this.customerEnquiries
      .getEnquiriesList()
      .subscribe((res: Customerenquiry[]) => {
        this.enquiries.set(res);
      });
  }

  loadTestimonials(): void {
    this.testimonialsService.getTestimonials().subscribe((res) => {
      this.testimonials.set(res.items || []);
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe((res) => {
      this.categories.set(res.items || []);
    });
  }

  loadAllProducts(): void {
    this.productService.getProducts("all").subscribe((res) => {
      this.allProducts.set(res.items || []);

      // If editing and category is already set, filter products
      if (this.testimonialForm().category && this.isEditMode()) {
        this.onCategoryChange();
      }
    });
  }

  onCategoryChange(): void {
    const currentForm = this.testimonialForm();

    // Only reset product fields if not in edit mode
    if (!this.isEditMode()) {
      this.testimonialForm.set({
        ...currentForm,
        product: "",
        "product-id": "",
      });
    }

    if (currentForm.category) {
      // If products aren't loaded yet, load them for the selected category
      if (this.allProducts().length === 0) {
        this.productService
          .getProducts(currentForm.category)
          .subscribe((res) => {
            this.filteredProducts.set(res.items || []);
          });
      } else {
        const filtered = this.allProducts().filter((p) => {
          if (!p.category) return false;

          // Check if category is an array
          if (Array.isArray(p.category)) {
            return p.category.some(
              (cat) =>
                String(cat).toLowerCase() ===
                String(currentForm.category).toLowerCase()
            );
          }

          // If category is a string
          return (
            String(p.category).toLowerCase() ===
            String(currentForm.category).toLowerCase()
          );
        });

        this.filteredProducts.set(filtered);

        // If no products found, try loading from API
        if (filtered.length === 0) {
          this.productService
            .getProducts(currentForm.category)
            .subscribe((res) => {
              this.filteredProducts.set(res.items || []);
            });
        }
      }
    } else {
      this.filteredProducts.set([]);
    }
  }

  onProductChange(event: any): void {
    // Find the selected product and set the product-id
    const currentForm = this.testimonialForm();
    const selectedProduct = this.filteredProducts().find(
      (p) => p.name === currentForm.product
    );
    if (selectedProduct) {
      this.testimonialForm.set({
        ...currentForm,
        "product-id": selectedProduct.id,
      });
    }
  }

  addOrUpdateTestimonial(): void {
    const currentForm = this.testimonialForm();
    if (
      !currentForm.category ||
      !currentForm.product ||
      !currentForm.comments
    ) {
      this.snackBar.open("Please fill all required fields", "Close", {
        duration: 3000,
      });
      return;
    }

    if (this.isEditMode() && this.editingTestimonial()) {
      this.testimonialsService
        .updateTestimonial(this.editingTestimonial()!.id, currentForm)
        .subscribe({
          next: () => {
            this.snackBar.open("Testimonial updated successfully", "Close", {
              duration: 3000,
            });
            this.loadTestimonials();
            this.resetForm();
          },
          error: (err) => {
            if (err?.error?.message?.includes?.("No token found")) {
              this.snackBar.open("Please Login", "Close", {
                duration: 3000,
              });
            } else {
              this.snackBar.open("Error updating testimonial", "Close", {
                duration: 3000,
              });
            }
          },
        });
    } else {
      this.testimonialsService.addTestimonial(currentForm).subscribe({
        next: () => {
          this.snackBar.open("Testimonial added successfully", "Close", {
            duration: 3000,
          });
          this.loadTestimonials();
          this.resetForm();
        },
        error: (err) => {
          if (err?.error?.message?.includes?.("No token found")) {
            this.snackBar.open("Please Login", "Close", {
              duration: 3000,
            });
          } else {
            this.snackBar.open("Error adding testimonial", "Close", {
              duration: 3000,
            });
          }
        },
      });
    }
  }

  editTestimonial(testimonial: Testimonial): void {
    this.isEditMode.set(true);
    this.editingTestimonial.set(testimonial);

    // First set the form with all values
    this.testimonialForm.set({
      category: testimonial.category,
      product: testimonial.product,
      "product-id": testimonial["product-id"],
      comments: testimonial.comments,
      rating: testimonial.rating,
      customerName: testimonial.customerName || "",
    });

    // Load products for the selected category without resetting product field
    if (this.allProducts().length > 0) {
      // Filter products but preserve the current product selection
      const filtered = this.allProducts().filter((p) => {
        if (!p.category) return false;

        // Check if category is an array
        if (Array.isArray(p.category)) {
          return p.category.some(
            (cat) =>
              String(cat).toLowerCase() ===
              String(testimonial.category).toLowerCase()
          );
        }

        // If category is a string
        return (
          String(p.category).toLowerCase() ===
          String(testimonial.category).toLowerCase()
        );
      });

      this.filteredProducts.set(filtered);

      // If no products found in cache, try loading from API
      if (filtered.length === 0) {
        this.productService
          .getProducts(testimonial.category)
          .subscribe((res) => {
            this.filteredProducts.set(res.items || []);
          });
      }
    } else {
      // Products not loaded yet, load them for this category
      this.productService.getProducts(testimonial.category).subscribe((res) => {
        this.filteredProducts.set(res.items || []);
      });
    }
  }

  deleteTestimonial(id: number): void {
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message:
          "Are you sure you want to delete this testimonial? (<strong>Note</strong>: This action cannot be undone)",
        button: "Delete",
      },
      width: "85%",
      maxWidth: "500px",
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.testimonialsService.deleteTestimonial(id).subscribe({
          next: () => {
            this.snackBar.open("Testimonial deleted successfully", "Close", {
              duration: 3000,
            });
            this.loadTestimonials();
          },
          error: (err) => {
            if (err?.error?.message?.includes?.("No token found")) {
              this.snackBar.open("Please Login", "Close", {
                duration: 3000,
              });
            } else {
              this.snackBar.open("Error deleting testimonial", "Close", {
                duration: 3000,
              });
            }
          },
        });
      }
    });
  }

  resetForm(): void {
    this.testimonialForm.set({
      category: "",
      product: "",
      "product-id": "",
      comments: "",
      rating: 0,
      customerName: "",
    });
    this.filteredProducts.set([]);
    this.isEditMode.set(false);
    this.editingTestimonial.set(null);
  }

  cancelEdit(): void {
    this.resetForm();
  }

  setRating(rating: number): void {
    this.testimonialForm.set({
      ...this.testimonialForm(),
      rating,
    });
  }

  clearRating(): void {
    this.testimonialForm.set({
      ...this.testimonialForm(),
      rating: 0,
    });
  }
}
