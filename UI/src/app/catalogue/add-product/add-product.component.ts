import { Component, OnInit } from "@angular/core";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { MaterialStandaloneModules } from "../../shared/material-standalone";
import { ProductService } from "../../services/product.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router, ActivatedRoute } from "@angular/router";
import { AppService } from "../../services/app.service";
import { NgxSpinnerService } from "ngx-spinner";
import { ProductPayload } from "../../models/app.model";

@Component({
  selector: "app-add-product",
  standalone: true,
  imports: [MaterialStandaloneModules],
  templateUrl: "./add-product.component.html",
  styleUrls: ["./add-product.component.scss"],
})
export class AddProductComponent implements OnInit {
  productForm: FormGroup;

  // Image handling
  imagePreviews: SafeUrl[] = []; // For UI preview
  existingImageUrls: string[] = []; // Already in S3
  imageFiles: File[] = []; // Newly uploaded files

  id = "";

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private router: Router,
    private appService: AppService,
    private spinner: NgxSpinnerService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check login
    this.appService.isLoggedIn$.subscribe((status) => {
      if (!status) this.router.navigate(["/login"]);
    });

    // Check for edit mode
    this.id = this.activatedRoute.snapshot.paramMap.get("id") || "";
    if (this.id) {
      this.loadProduct(this.id);
    } else {
      this.createForm(); // Add mode
    }
  }

  /** Load product in edit mode */
  private loadProduct(id: string) {
    this.productService
      .getAProduct(id)
      .subscribe((res: { items: ProductPayload }) => {
        this.createForm(res.items);
        if (res.items.images?.length) this.loadExistingImages(res.items.images);
      });
  }

  /** Load existing images for preview and tracking */
  private loadExistingImages(urls: string[]) {
    this.existingImageUrls = [...urls];
    urls.forEach((url) =>
      this.imagePreviews.push(this.sanitizer.bypassSecurityTrustUrl(url))
    );
  }

  /** Form creation */
  private createForm(data?: ProductPayload) {
    const variantsArray = data?.variants
      ? data.variants.map((v: any) => this.createVariantGroup(v))
      : [this.createVariantGroup()];

    this.productForm = this.fb.group({
      name: [
        data?.name || "",
        [Validators.required, Validators.maxLength(120)],
      ],
      desc: [
        data?.desc || "",
        [Validators.required, Validators.maxLength(500)],
      ],
      variants: this.fb.array(variantsArray),
    });
  }

  private createVariantGroup(variant?: any): FormGroup {
    return this.fb.group({
      size: [variant?.size || null, [Validators.required, Validators.min(0)]],
      measurement: [variant?.measurement || "cm", [Validators.required]],
      price: [variant?.price || null, [Validators.required, Validators.min(0)]],
    });
  }

  get variants(): FormArray {
    return this.productForm.get("variants") as FormArray;
  }

  addVariant() {
    this.variants.push(this.createVariantGroup());
  }

  removeVariant(index: number) {
    if (this.variants.length > 1) {
      this.variants.removeAt(index);
    } else {
      this.variants.at(0).reset({ measurement: "cm" });
    }
  }

  /** Handle new file selection */
  onFilesSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files) return;

    Array.from(target.files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open(`${file.name} is > 5MB. Skipped.`, undefined, {
          duration: 2500,
        });
        return;
      }

      this.imageFiles.push(file);

      const reader = new FileReader();
      reader.onload = (e) =>
        this.imagePreviews.push(
          this.sanitizer.bypassSecurityTrustUrl(e.target!.result as string)
        );
      reader.readAsDataURL(file);
    });

    target.value = "";
  }

  /** Remove image (existing or new) */
  removeImage(index: number) {
    if (this.isExisting(index)) {
      const existingIndex = index;
      this.existingImageUrls.splice(existingIndex, 1);
    } else {
      const newIndex = index - this.existingImageUrls.length;
      this.imageFiles.splice(newIndex, 1);
    }
    this.imagePreviews.splice(index, 1);
  }

  /** Check if the image is from existing URLs */
  isExisting(index: number): boolean {
    return index < this.existingImageUrls.length;
  }

  /** Trigger file input */
  uploadImages() {
    document.getElementById("imageInput")?.click();
  }

  /** Submit form */
  submit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.snackBar.open("Please fix validation errors", undefined, {
        duration: 2500,
      });
      return;
    }

    this.spinner.show();

    const formData = new FormData();
    formData.append("name", this.productForm.value.name);
    formData.append("desc", this.productForm.value.desc);
    this.productForm.value.variants.forEach((v, i) => {
      formData.append(`variants[${i}][size]`, v.size);
      formData.append(`variants[${i}][measurement]`, v.measurement);
      formData.append(`variants[${i}][price]`, v.price);
    });

    // Append new images
    this.imageFiles.forEach((file) => formData.append("images", file));

    // Append existing image URLs
    if (this.existingImageUrls.length) {
      formData.append("existingImages", JSON.stringify(this.existingImageUrls));
    }

    const action = this.id ? "updateProduct" : "addProduct";
    this.productService[action](formData, this.id).subscribe({
      next: () => {
        this.spinner.hide();
        this.snackBar.open(
          `Product ${this.id ? "updated" : "added"} successfully`,
          undefined,
          {
            duration: 3000,
          }
        );
        this.router.navigate(["/catalogue"]);
      },
      error: (err) => {
        this.spinner.hide();
        if (err?.error?.message?.includes?.("No token found")) {
          this.snackBar.open("Please login", undefined, { duration: 3000 });
          this.router.navigate(["/login"]);
        } else {
          this.snackBar.open("Error Occurred", undefined, { duration: 3000 });
        }
      },
    });
  }
}
