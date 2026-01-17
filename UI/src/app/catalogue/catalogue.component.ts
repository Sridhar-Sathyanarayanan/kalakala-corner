import { CommonModule } from "@angular/common";
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
  signal,
  computed,
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { firstValueFrom, Subject, takeUntil, forkJoin } from "rxjs";
import {
  Product,
  ProductPayload,
  ProductWithPricing,
} from "../models/app.model";
import { AppService } from "../services/app.service";
import { ProductService } from "../services/product.service";
import { ConfirmationModalComponent } from "../shared/confirmation/confirmation-modal.component";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { ProductDetailsComponent } from "./product-details/product-details.component";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { PageEvent } from "@angular/material/paginator";
import { NgxSpinnerService } from "ngx-spinner";

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrl: "./catalogue.component.scss",
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit, OnDestroy {
  // Constants
  private readonly DEFAULT_PAGE_SIZE = 9;
  private readonly PDF_MARGIN = 15;
  private readonly PDF_IMAGE_WIDTH = 50;
  private readonly PDF_IMAGE_HEIGHT = 40;
  private readonly PDF_IMAGE_SPACING = 5;
  readonly PAGE_SIZE = 9; // Fixed page size, no pagination selector
  // Modern inject() pattern - Angular 21 best practice
  private readonly productService = inject(ProductService);
  readonly appService = inject(AppService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly spinner = inject(NgxSpinnerService);

  @ViewChild("catalogueContent", { read: ElementRef })
  catalogueContent?: ElementRef;

  // Signals for reactive state management (Angular 21 best practice)
  products = signal<ProductWithPricing[]>([]);
  category = signal<string>("");
  categoryTitle = signal<string>("");
  currentPage = signal<number>(0);
  loading = signal<boolean>(true);
  errorMessage = signal<string>("");

  // Price filter signals
  minPriceFilter = signal<number | null>(null);
  maxPriceFilter = signal<number | null>(null);
  minPriceInput = signal<number | null>(null); // Temporary input value
  maxPriceInput = signal<number | null>(null); // Temporary input value
  minPriceAvailable = signal<number>(0);
  maxPriceAvailable = signal<number>(10000);
  filterPanelExpanded = signal<boolean>(false);

  // Search filter signals
  searchFilter = signal<string>("");
  searchInput = signal<string>(""); // Temporary input value

  // Discount filter signals
  discountFilter = signal<boolean>(false); // Applied discount filter
  discountFilterInput = signal<boolean>(false); // Temporary input value

  // Computed signals for filter state
  hasActiveFilters = computed(() => {
    return (
      this.searchFilter() !== "" ||
      this.minPriceFilter() !== null ||
      this.maxPriceFilter() !== null ||
      this.discountFilter()
    );
  });

  hasFilterInputs = computed(() => {
    return (
      this.searchInput() !== "" ||
      this.minPriceInput() !== null ||
      this.maxPriceInput() !== null ||
      this.discountFilterInput()
    );
  });

  // Computed signal for filtered products
  filteredProducts = computed(() => {
    const allProducts = this.products();
    const minPrice = this.minPriceFilter();
    const maxPrice = this.maxPriceFilter();
    const searchText = this.searchFilter().toLowerCase().trim();
    const onlyDiscounted = this.discountFilter();

    return allProducts.filter((product) => {
      // Discount filter
      if (onlyDiscounted && !product.hasDiscount) {
        return false;
      }

      // Search filter
      if (searchText) {
        const nameMatch =
          product.name?.toLowerCase().includes(searchText) ?? false;
        const descMatch =
          product.desc?.toLowerCase().includes(searchText) ?? false;
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      // Price filter
      if (minPrice !== null || maxPrice !== null) {
        const productMinPrice = product.displayMinPrice ?? 0;
        const productMaxPrice = product.displayMaxPrice ?? productMinPrice;

        const filterMin = minPrice ?? 0;
        const filterMax = maxPrice ?? Number.MAX_SAFE_INTEGER;

        if (!(productMinPrice <= filterMax && productMaxPrice >= filterMin)) {
          return false;
        }
      }

      return true;
    });
  });

  // Computed signal for paginated products
  paginatedProducts = computed(() => {
    const startIndex = this.currentPage() * this.PAGE_SIZE;
    const endIndex = startIndex + this.PAGE_SIZE;
    return this.filteredProducts().slice(startIndex, endIndex);
  });

  private readonly destroy$ = new Subject<void>();
  private categoryChange$ = new Subject<void>();

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        this.loading.set(true);
        this.errorMessage.set("");
        const newCategory = params.get("category");

        if (!newCategory) {
          this.router.navigate(["/catalogue/all"]);
          return;
        }

        // Cancel previous requests if category actually changed
        if (this.category() && this.category() !== newCategory) {
          this.categoryChange$.next();
          this.spinner.hide(); // Hide spinner from previous request

          // Create a new Subject for the new category to avoid immediate cancellation
          this.categoryChange$ = new Subject<void>();
        }

        this.category.set(newCategory);

        // Clear filters when category changes
        this.resetFilters();

        // Load category info and products in parallel
        this.loadCategoryData(this.category());
      },
      error: (error) => {
        console.error("Error in route params:", error);
        this.loading.set(false);
        this.spinner.hide();
        this.errorMessage.set("Failed to load category information.");
      },
    });
  }

  ngOnDestroy(): void {
    this.spinner.hide();
    this.categoryChange$.next();
    this.categoryChange$.complete();
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup: restore body scroll
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }

  private loadCategoryData(category: string): void {
    this.spinner.show();

    forkJoin({
      categories: this.productService.getCategories(),
      products: this.productService.getProducts(category),
    })
      .pipe(takeUntil(this.categoryChange$), takeUntil(this.destroy$))
      .subscribe({
        next: ({ categories, products }) => {
          // Set category title
          const categoryData = categories.items.find(
            (d) => d.path === this.category()
          );
          this.categoryTitle.set(categoryData?.name || "All Products");
          // Set products
          const productsList = products?.items || [];
          this.calculateProductPricing(productsList);
          this.products.set(productsList);
          this.currentPage.set(0);

          this.loading.set(false);
          this.spinner.hide();
        },
        error: (err) => {
          console.error("Error loading category data:", err);
          this.products.set([]);
          this.categoryTitle.set("");
          this.loading.set(false);
          this.spinner.hide();
          this.errorMessage.set(
            "Failed to load products. Please try again later."
          );
        },
      });
  }



  getProductsList(category?: string): void {
    this.spinner.show();
    this.errorMessage.set("");
    this.productService
      .getProducts(category)
      .pipe(takeUntil(this.categoryChange$), takeUntil(this.destroy$))
      .subscribe({
        next: (data: Product) => {
          this.spinner.hide();
          this.loading.set(false);
          const productsList = data?.items || [];
          this.calculateProductPricing(productsList);
          this.products.set(productsList);
          this.currentPage.set(0);
        },
        error: (err) => {
          this.spinner.hide();
          this.loading.set(false);
          this.products.set([]);
          this.errorMessage.set(
            "Failed to load products. Please try again later."
          );
          console.error("Error loading products:", err);
        },
      });
  }

  private calculateProductPricing(products: ProductWithPricing[]): void {
    products.forEach((p) => {
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        const regularPrices: number[] = [];
        const discountedPrices: number[] = [];
        const priceDiscountPairs: { original: number; discounted: number }[] =
          [];

        p.variants.forEach((variant) => {
          const price = Number(variant.price);
          const discountedPrice = Number(variant.discountedPrice);

          if (!isNaN(price) && price > 0) {
            regularPrices.push(price);
          }

          if (!isNaN(discountedPrice) && discountedPrice > 0) {
            discountedPrices.push(discountedPrice);

            if (!isNaN(price) && price > 0 && discountedPrice < price) {
              priceDiscountPairs.push({
                original: price,
                discounted: discountedPrice,
              });
            }
          }
        });

        const allAvailablePrices = [...discountedPrices, ...regularPrices];
        if (allAvailablePrices.length > 0) {
          p.displayMinPrice = Math.min(...allAvailablePrices);
        }

        if (regularPrices.length > 0) {
          p.displayMaxPrice = Math.max(...regularPrices);
          p.originalMinPrice = Math.min(...regularPrices);
          p.originalMaxPrice = Math.max(...regularPrices);
        }

        p.hasDiscount = priceDiscountPairs.length > 0;
        if (p.hasDiscount) {
          const discountPercentages = priceDiscountPairs.map((pair) =>
            Math.round(
              ((pair.original - pair.discounted) / pair.original) * 100
            )
          );
          p.maxDiscountPercent = Math.max(...discountPercentages);
        } else {
          p.maxDiscountPercent = 0;
        }
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);

    // Scroll to top of catalogue when page changes
    if (this.catalogueContent?.nativeElement) {
      this.catalogueContent.nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  goToFirstPage(): void {
    this.currentPage.set(0);
    this.scrollToTop();
  }

  goToPreviousPage(): void {
    const newPage = Math.max(0, this.currentPage() - 1);
    this.currentPage.set(newPage);
    this.scrollToTop();
  }

  goToNextPage(): void {
    const lastPage = Math.ceil(this.products().length / this.PAGE_SIZE) - 1;
    const newPage = Math.min(lastPage, this.currentPage() + 1);
    this.currentPage.set(newPage);
    this.scrollToTop();
  }

  goToLastPage(): void {
    const lastPage = Math.ceil(this.products().length / this.PAGE_SIZE) - 1;
    this.currentPage.set(lastPage);
    this.scrollToTop();
  }

  hasNextPage(): boolean {
    const lastPage = Math.ceil(this.filteredProducts().length / this.PAGE_SIZE) - 1;
    return this.currentPage() < lastPage;
  }

  private scrollToTop(): void {
    if (this.catalogueContent?.nativeElement) {
      this.catalogueContent.nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  private updatePriceRange(products: ProductWithPricing[]): void {
    if (products.length === 0) {
      this.minPriceAvailable.set(0);
      this.maxPriceAvailable.set(10000);
      return;
    }

    const prices = products
      .map((p) => p.displayMinPrice ?? 0)
      .filter((price) => price > 0);

    if (prices.length > 0) {
      this.minPriceAvailable.set(Math.floor(Math.min(...prices)));
      this.maxPriceAvailable.set(Math.ceil(Math.max(...prices)));
    }
  }

  applyFilters(): void {
    this.searchFilter.set(this.searchInput());
    this.minPriceFilter.set(this.minPriceInput());
    this.maxPriceFilter.set(this.maxPriceInput());
    this.discountFilter.set(this.discountFilterInput());
    this.currentPage.set(0); // Reset to first page when filter changes
  }

  resetFilters(): void {
    this.searchFilter.set("");
    this.searchInput.set("");
    this.minPriceFilter.set(null);
    this.maxPriceFilter.set(null);
    this.minPriceInput.set(null);
    this.maxPriceInput.set(null);
    this.discountFilter.set(false);
    this.discountFilterInput.set(false);
    this.currentPage.set(0);
  }

  toggleFilterPanel(): void {
    this.filterPanelExpanded.set(!this.filterPanelExpanded());
  }

  isSmallScreen(): boolean {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const placeholder = img.nextElementSibling as HTMLElement;
    if (img && placeholder) {
      img.style.display = "none";
      placeholder.style.display = "flex";
    }
  }

  calculateDiscount(originalPrice: number, discountedPrice: number): number {
    if (
      !originalPrice ||
      !discountedPrice ||
      discountedPrice >= originalPrice
    ) {
      return 0;
    }
    return Math.round(
      ((originalPrice - discountedPrice) / originalPrice) * 100
    );
  }

  async downloadPDF(): Promise<void> {
    this.spinner.show();
    this.errorMessage.set("");

    try {
      const data = await firstValueFrom(
        this.productService
          .downloadPDF(this.category())
          .pipe(takeUntil(this.destroy$))
      );

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = this.PDF_MARGIN;
      const imageWidth = this.PDF_IMAGE_WIDTH;
      const imageHeight = this.PDF_IMAGE_HEIGHT;
      let y = 40;

      doc.setFontSize(16);
      const catalogTitle =
        this.category() === "all"
          ? "Products Catalog - All Categories"
          : `Products Catalog - ${this.categoryTitle()}`;
      doc.text(catalogTitle, doc.internal.pageSize.getWidth() / 2, 15, {
        align: "center",
      });

      for (const item of data.items) {
        // Calculate how many images we have and the space needed
        const imageCount = item.images?.length || 0;
        const imagesPerRow = 3;
        const imageRows = Math.ceil(imageCount / imagesPerRow);
        const totalImageHeight =
          imageRows > 0
            ? imageRows * (imageHeight + this.PDF_IMAGE_SPACING)
            : 0;

        // Calculate table height (header + rows)
        const variantCount = item.variants?.length || 0;
        const rowHeight = 9; // fontSize 9 + cellPadding 2*2 = ~9mm per row
        const tableHeight = (variantCount + 1) * rowHeight; // +1 for header

        // Calculate description height
        const descLines = doc.splitTextToSize(
          item.desc,
          doc.internal.pageSize.getWidth() - 2 * margin - 10
        );
        const descHeight = descLines.length * 5; // Approximate height per line

        // Total content height: title(10) + desc(variable) + images + table + padding
        const contentHeight =
          15 + descHeight + totalImageHeight + tableHeight + 10;

        // Check if we need a new page
        if (y + contentHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        const sectionStartY = y;

        // Product title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(item.name, margin + 5, y + 10);

        // Product description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(descLines, margin + 5, y + 18);

        // Render all images in a grid
        if (item.images && item.images.length > 0) {
          const startY = y + 18 + descHeight + 5;
          let currentX = margin + 5;
          let currentY = startY;
          let imagesInCurrentRow = 0;

          for (let i = 0; i < item.images.length; i++) {
            try {
              const imgData = await this.toBase64(item.images[i]);
              doc.addImage(
                imgData,
                "JPEG",
                currentX,
                currentY,
                imageWidth,
                imageHeight,
                undefined,
                "FAST"
              );
            } catch (e) {
              // Draw placeholder for failed images
              doc.setFillColor(230, 230, 230);
              doc.rect(currentX, currentY, imageWidth, imageHeight, "F");
              doc.setTextColor(150, 150, 150);
              doc.setFontSize(8);
              doc.text(
                "Image not\navailable",
                currentX + 5,
                currentY + imageHeight / 2
              );
              doc.setTextColor(0, 0, 0); // Reset text color
            }

            imagesInCurrentRow++;

            // Move to next position
            if (imagesInCurrentRow < imagesPerRow) {
              currentX += imageWidth + this.PDF_IMAGE_SPACING;
            } else {
              // Move to next row
              currentX = margin + 5;
              currentY += imageHeight + this.PDF_IMAGE_SPACING;
              imagesInCurrentRow = 0;
            }
          }
        }

        // Prepare variant table
        const variantRows = item.variants.map((v: any) => {
          const originalPrice =
            v.price && Number(v.price) > 0 ? `Rs. ${v.price}` : "--";
          const discountedPrice =
            v.discountedPrice && Number(v.discountedPrice) > 0
              ? `Rs. ${v.discountedPrice}`
              : "--";

          return [v.size || "--", originalPrice, discountedPrice];
        });

        // Add variant table below images
        const tableStartY = y + 18 + descHeight + 5 + totalImageHeight + 3;
        autoTable(doc, {
          startY: tableStartY,
          margin: { left: margin + 5, right: margin + 5 },
          head: [["Size", "Original Price", "Discounted Price"]],
          body: variantRows,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: {
            fillColor: [255, 20, 147],
            textColor: 255,
            fontSize: 9,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
          },
          theme: "grid",
        });

        // Get the final Y position after the table
        const finalY = (doc as any).lastAutoTable.finalY;

        // Draw border for product section after all content is rendered
        doc.setDrawColor(180);
        doc.roundedRect(
          margin,
          sectionStartY,
          doc.internal.pageSize.getWidth() - 2 * margin,
          finalY - sectionStartY + 5,
          4,
          4
        );

        y = finalY + 10;
      }

      doc.save("products-catalog.pdf");
      this.spinner.hide();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      this.spinner.hide();
      this.errorMessage.set("Failed to generate PDF. Please try again.");
    }
  }

  private async toBase64(input: string | Blob): Promise<string> {
    let blob: Blob;
    if (typeof input === "string") {
      try {
        blob = await firstValueFrom(this.productService.fetchS3Image(input));
      } catch (err) {
        const res = await fetch(input, { mode: "cors" });
        blob = await res.blob();
      }
    } else {
      blob = input;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  openProductModal(product: ProductPayload): void {
    const isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    this.dialog.open(ProductDetailsComponent, {
      data: product,
      width: isMobile ? "95%" : "90%",
      maxWidth: "1200px",
      maxHeight: "90vh",
      height: "95%",
      panelClass: "product-details-dialog",
      backdropClass: "product-details-backdrop",
    });
  }

  edit(product: ProductPayload): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(["/edit-product", product.id])
    );
    window.open(url, "_blank");
  }

  delete(product: ProductPayload): void {
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message:
          "Are you sure you want to delete the product? (<strong>Note</strong>: This will permanently delete the product from database)",
        button: "Delete",
      },
      width: "85%",
      maxWidth: "500px",
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            this.spinner.show();
            this.errorMessage.set("");
            this.productService
              .deleteProduct(product.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.spinner.hide();
                  this.getProductsList(this.category());
                },
                error: (error) => {
                  console.error("Error deleting product:", error);
                  this.spinner.hide();
                  this.errorMessage.set(
                    "Failed to delete product. Please try again."
                  );
                },
              });
          }
        },
        error: (error) => {
          console.error("Error in dialog:", error);
          this.errorMessage.set("An error occurred. Please try again.");
        },
      });
  }
}
