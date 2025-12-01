import { Component, OnInit } from "@angular/core";
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
  styleUrls: ["./admin.component.scss"],
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
    "comments",
    "rating",
    "updatedAt",
    "actions",
  ];

  // enquiries data
  enquiries: Customerenquiry[] = [];
  
  // testimonials data
  testimonials: Testimonial[] = [];
  categories: any[] = [];
  allProducts: any[] = [];
  filteredProducts: any[] = [];
  
  // testimonial form
  testimonialForm = {
    category: "",
    product: "",
    "product-id": "",
    comments: "",
    rating: 0,
  };
  
  editingTestimonial: Testimonial | null = null;
  isEditMode = false;

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
        this.enquiries = res;
      });
  }

  loadTestimonials(): void {
    this.testimonialsService.getTestimonials().subscribe((res) => {
      this.testimonials = res.items || [];
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe((res) => {
      this.categories = res.items || [];
    });
  }

  loadAllProducts(): void {
    this.productService.getProducts("all").subscribe((res) => {
      this.allProducts = res.items || [];
      console.log('Loaded all products:', this.allProducts.length);
      // If editing and category is already set, filter products
      if (this.testimonialForm.category && this.isEditMode) {
        this.onCategoryChange();
      }
    });
  }

  onCategoryChange(): void {
    this.testimonialForm.product = ""; // Reset product selection
    this.testimonialForm["product-id"] = ""; // Reset product-id
    if (this.testimonialForm.category) {
      // If products aren't loaded yet, load them for the selected category
      if (this.allProducts.length === 0) {
        this.productService.getProducts(this.testimonialForm.category).subscribe((res) => {
          this.filteredProducts = res.items || [];
          console.log('Loaded products for category:', this.filteredProducts);
        });
      } else {
        // Log all product categories to debug
        console.log('All product categories:', this.allProducts.map(p => p.category));
        console.log('Selected category:', this.testimonialForm.category);
        
        this.filteredProducts = this.allProducts.filter((p) => {
          if (!p.category) return false;
          
          // Check if category is an array
          if (Array.isArray(p.category)) {
            return p.category.some(cat => 
              String(cat).toLowerCase() === String(this.testimonialForm.category).toLowerCase()
            );
          }
          
          // If category is a string
          return String(p.category).toLowerCase() === String(this.testimonialForm.category).toLowerCase();
        });
        
        console.log('Filtered products:', this.filteredProducts);
        
        // If no products found, try loading from API
        if (this.filteredProducts.length === 0) {
          console.log('No products found in cache, loading from API...');
          this.productService.getProducts(this.testimonialForm.category).subscribe((res) => {
            this.filteredProducts = res.items || [];
            console.log('API loaded products:', this.filteredProducts);
          });
        }
      }
    } else {
      this.filteredProducts = [];
    }
  }

  onProductChange(event: any): void {
    // Find the selected product and set the product-id
    const selectedProduct = this.filteredProducts.find(
      (p) => p.name === this.testimonialForm.product
    );
    if (selectedProduct) {
      this.testimonialForm["product-id"] = selectedProduct.id;
    }
  }

  addOrUpdateTestimonial(): void {
    if (!this.testimonialForm.category || !this.testimonialForm.product || !this.testimonialForm.comments) {
      this.snackBar.open("Please fill all required fields", "Close", {
        duration: 3000,
      });
      return;
    }

    if (this.isEditMode && this.editingTestimonial) {
      this.testimonialsService
        .updateTestimonial(this.editingTestimonial.id, this.testimonialForm)
        .subscribe({
          next: () => {
            this.snackBar.open("Testimonial updated successfully", "Close", {
              duration: 3000,
            });
            this.loadTestimonials();
            this.resetForm();
          },
          error: (err) => {
            this.snackBar.open("Error updating testimonial", "Close", {
              duration: 3000,
            });
          },
        });
    } else {
      this.testimonialsService.addTestimonial(this.testimonialForm).subscribe({
        next: () => {
          this.snackBar.open("Testimonial added successfully", "Close", {
            duration: 3000,
          });
          this.loadTestimonials();
          this.resetForm();
        },
        error: (err) => {
          this.snackBar.open("Error adding testimonial", "Close", {
            duration: 3000,
          });
        },
      });
    }
  }

  editTestimonial(testimonial: Testimonial): void {
    this.isEditMode = true;
    this.editingTestimonial = testimonial;
    this.testimonialForm = {
      category: testimonial.category,
      product: testimonial.product,
      "product-id": testimonial["product-id"],
      comments: testimonial.comments,
      rating: testimonial.rating,
    };
    // Load products for the selected category
    if (this.allProducts.length > 0) {
      this.onCategoryChange();
    } else {
      // Products not loaded yet, load them for this category
      this.productService.getProducts(testimonial.category).subscribe((res) => {
        this.filteredProducts = res.items || [];
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
            this.snackBar.open("Error deleting testimonial", "Close", {
              duration: 3000,
            });
          },
        });
      }
    });
  }

  resetForm(): void {
    this.testimonialForm = {
      category: "",
      product: "",
      "product-id": "",
      comments: "",
      rating: 0,
    };
    this.filteredProducts = [];
    this.isEditMode = false;
    this.editingTestimonial = null;
  }
  
  cancelEdit(): void {
    this.resetForm();
  }

  setRating(rating: number): void {
    this.testimonialForm.rating = rating;
  }

  clearRating(): void {
    this.testimonialForm.rating = 0;
  }
}
