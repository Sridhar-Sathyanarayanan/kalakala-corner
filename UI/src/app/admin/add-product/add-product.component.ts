import { Component, OnInit } from "@angular/core";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { NgxSpinnerService } from "ngx-spinner";
import { forkJoin } from "rxjs";

import { MaterialStandaloneModules } from "../../shared/material-standalone";
import { ProductService } from "../../services/product.service";
import { AppService } from "../../services/app.service";
import { ProductPayload } from "../../models/app.model";

@Component({
  selector: "app-add-product",
  standalone: true,
  imports: [MaterialStandaloneModules],
  templateUrl: "./add-product.component.html",
  styleUrl: "./add-product.component.scss",
})
export class AddProductComponent implements OnInit {
  productForm!: FormGroup;

  categories: any[] = [];
  id = "";

  // Images
  imagePreviews: SafeUrl[] = [];
  imageFiles: File[] = [];
  existingImageUrls: string[] = [];
  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private appService: AppService,
    private spinner: NgxSpinnerService
  ) {}

  // --------------------------------
  // Lifecycle
  // --------------------------------
  ngOnInit(): void {
    this.initForm();

    this.appService.isLoggedIn$.subscribe((status) => {
      if (!status) this.router.navigate(["/login"]);
    });

    this.id = this.route.snapshot.paramMap.get("id") || "";

    if (this.id) {
      this.loadEditData();
    } else {
      this.loadCategoriesOnly();
    }
  }

  // --------------------------------
  // Form Init
  // --------------------------------
  private initForm() {
    this.productForm = this.fb.group({
      name: ["", [Validators.required, Validators.maxLength(120)]],
      desc: ["", [Validators.required, Validators.maxLength(500)]],
      category: [[], Validators.required],
      variants: this.fb.array([this.createVariantGroup()]),
      notes: this.fb.array([this.fb.control("", Validators.required)]),
    });
  }

  private createVariantGroup(data?: any): FormGroup {
    return this.fb.group({
      size: [data?.size || "", Validators.required],
      price: [data?.price ?? 0, Validators.min(0)],
      discountedPrice: [data?.discountedPrice ?? 0, Validators.min(0)],
    });
  }

  // --------------------------------
  // Getters
  // --------------------------------
  get variants(): FormArray {
    return this.productForm.get("variants") as FormArray;
  }
  ;
  get notes(): FormArray {
    return this.productForm.get("notes") as FormArray;
  }

  // --------------------------------
  // Data Loading (forkJoin)
  // --------------------------------
  private loadEditData() {
    this.spinner.show();

    forkJoin({
      categories: this.productService.getCategories(),
      product: this.productService.getAProduct(this.id),
    }).subscribe({
      next: ({ categories, product }) => {
        this.spinner.hide();
        this.categories = categories.items;
        this.populateForm(product.items);
      },
      error: () => this.spinner.hide(),
    });
  }

  private loadCategoriesOnly() {
    this.productService.getCategories().subscribe((res) => {
      this.categories = res.items;
    });
  }

  private populateForm(data: ProductPayload) {
    this.productForm.patchValue({
      name: data.name,
      desc: data.desc,
      category: data.category, // ✅ categories already loaded
    });

    this.setVariants(data.variants);
    this.setNotes(data.notes);

    if (data.images?.length) {
      this.loadExistingImages(data.images);
    }
  }

  private setVariants(list: any[]) {
    this.variants.clear();
    list.forEach((v) => this.variants.push(this.createVariantGroup(v)));
  }

  private setNotes(list: string[]) {
    this.notes.clear();
    list.forEach((n) =>
      this.notes.push(this.fb.control(n, Validators.required))
    );
  }

  // --------------------------------
  // Variants / Notes Actions
  // --------------------------------
  addVariant() {
    this.variants.push(this.createVariantGroup());
  }

  removeVariant(index: number) {
    this.variants.length > 1
      ? this.variants.removeAt(index)
      : this.variants.at(0).reset();
  }
  addNote() {
    this.notes.push(this.fb.control("", Validators.maxLength(250)));
  }

  removeNote(index: number) {
    this.notes.length > 1
      ? this.notes.removeAt(index)
      : this.notes.at(0).reset();
  }

  // --------------------------------
  // Image Handling
  // --------------------------------
  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open(`${file.name} > 5MB skipped`, undefined, {
          duration: 2500,
        });
        return;
      }

      this.imageFiles.push(file);

      const reader = new FileReader();
      reader.onload = () =>
        this.imagePreviews.push(
          this.sanitizer.bypassSecurityTrustUrl(reader.result as string)
        );
      reader.readAsDataURL(file);
    });

    input.value = "";
  }

  private loadExistingImages(urls: string[]) {
    this.existingImageUrls = [...urls];
    urls.forEach((url) =>
      this.imagePreviews.push(this.sanitizer.bypassSecurityTrustUrl(url))
    );
  }

  removeImage(index: number) {
    if (index < this.existingImageUrls.length) {
      this.existingImageUrls.splice(index, 1);
    } else {
      this.imageFiles.splice(index - this.existingImageUrls.length, 1);
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
  // --------------------------------
  // Submit
  // --------------------------------
  submit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.snackBar.open("Fix validation errors", undefined, {
        duration: 2500,
      });
      return;
    }

    this.spinner.show();
    const v = this.productForm.value;
    const fd = new FormData();

    fd.append("name", v.name);
    fd.append("desc", v.desc);

    v.category.forEach((c: string, i: number) =>
      fd.append(`category[${i}]`, c)
    );

    v.variants.forEach((vr: any, i: number) => {
      fd.append(`variants[${i}][size]`, vr.size);
      fd.append(`variants[${i}][price]`, vr.price);
      fd.append(`variants[${i}][discountedPrice]`, vr.discountedPrice);
    });

    v.notes.forEach((n: string, i: number) => fd.append(`notes[${i}]`, n));

    this.imageFiles.forEach((f) => fd.append("images", f));

    if (this.existingImageUrls.length) {
      fd.append("existingImages", JSON.stringify(this.existingImageUrls));
    }

    const action = this.id ? "updateProduct" : "addProduct";

    this.productService[action](fd, this.id).subscribe({
      next: () => {
        this.spinner.hide();
        this.snackBar.open(
          `Product ${this.id ? "updated" : "added"} successfully`,
          undefined,
          { duration: 3000 }
        );
        this.router.navigate(["/catalogue/all"]);
      },
      error: () => {
        this.spinner.hide();
        this.snackBar.open("Error occurred", undefined, {
          duration: 3000,
        });
      },
    });
  }
}
