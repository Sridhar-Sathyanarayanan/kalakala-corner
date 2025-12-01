import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { firstValueFrom, Subject, takeUntil } from "rxjs";
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
import { MatPaginatorIntl, PageEvent } from "@angular/material/paginator";
import { NgxSpinnerService } from "ngx-spinner";

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrls: ["./catalogue.component.scss"],
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit, OnDestroy {
  products: ProductWithPricing[] = [];
  category: string;
  categoryTitle = "";
  pageSize = 9;
  currentPage = 0;
  paginatedProducts: ProductWithPricing[] = [];
  private destroy$ = new Subject<void>();
  loading = true;

  constructor(
    private productService: ProductService,
    public appService: AppService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver,
    private paginatorIntl: MatPaginatorIntl,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.setPaginatorTooltips();
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.loading = true;
      this.category = params.get("category");
      if (!this.category) {
        this.router.navigate(["/catalogue/all"]);
        return;
      }
      this.productService
        .getCategories()
        .pipe(takeUntil(this.destroy$))
        .subscribe((data) => {
          const categoryTitle = data.items.find(
            (d) => d.path === this.category
          );
          this.categoryTitle = categoryTitle ? categoryTitle.name : "All Items";
        });

      this.getProductsList(this.category);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setPaginatorTooltips(): void {
    this.paginatorIntl.itemsPerPageLabel = "Items per page";
    this.paginatorIntl.nextPageLabel = "Next page";
    this.paginatorIntl.previousPageLabel = "Previous page";
    this.paginatorIntl.firstPageLabel = "First page";
    this.paginatorIntl.lastPageLabel = "Last page";
    this.paginatorIntl.getRangeLabel = (
      page: number,
      pageSize: number,
      length: number
    ) => {
      if (length === 0) {
        return `0 of 0`;
      }
      const startIndex = page * pageSize;
      const endIndex =
        startIndex < length
          ? Math.min(startIndex + pageSize, length)
          : startIndex + pageSize;
      return `${startIndex + 1} - ${endIndex} of ${length}`;
    };
    this.paginatorIntl.changes.next();
  }

  getProductsList(category?: string): void {
    this.products = [];
    this.spinner.show();
    this.productService
      .getProducts(category)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: Product) => {
        this.spinner.hide();
        this.loading = false;
        this.products = data.items;
        this.currentPage = 0; // Reset to first page when loading new products
        this.applyPagination();
        this.calculateProductPricing();
      });
  }

  private calculateProductPricing(): void {
    this.products.forEach((p) => {
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

  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProducts = this.products.slice(startIndex, endIndex);

    // Scroll to top of catalogue when page changes
    const catalogueElement = document.getElementById("catalogue-content");
    if (catalogueElement) {
      catalogueElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
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

  downloadPDF(): void {
    this.productService
      .downloadPDF()
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (data) => {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const margin = 15;
        const imageWidth = 50;
        const imageHeight = 40;
        let y = 40;

        doc.setFontSize(16);
        doc.text("Products Catalog", doc.internal.pageSize.getWidth() / 2, 15, {
          align: "center",
        });

        for (const item of data.items) {
          if (
            y + imageHeight + 30 >
            doc.internal.pageSize.getHeight() - margin
          ) {
            doc.addPage();
            y = margin;
          }

          doc.setDrawColor(180);
          doc.roundedRect(
            margin,
            y,
            doc.internal.pageSize.getWidth() - 2 * margin,
            imageHeight + 30,
            4,
            4
          );

          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.text(item.name, margin + imageWidth + 10, y + 10);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const descLines = doc.splitTextToSize(
            item.desc,
            doc.internal.pageSize.getWidth() - (margin + imageWidth + 15)
          );
          doc.text(descLines, margin + imageWidth + 10, y + 18);

          const variantRows = item.variants.map((v: any) => {
            const hasDiscount =
              v.discountedPrice && Number(v.discountedPrice) < Number(v.price);
            if (hasDiscount) {
              const discount = this.calculateDiscount(
                Number(v.price),
                Number(v.discountedPrice)
              );
              return [
                v.size,
                `₹${v.discountedPrice}`,
                `₹${v.price}`,
                `${discount}% OFF`,
              ];
            } else {
              return [v.size, `₹${v.price}`, "-", "-"];
            }
          });

          autoTable(doc, {
            startY: y + imageHeight - 2,
            margin: { left: margin + imageWidth + 10 },
            head: [["Size", "Price", "Original", "Discount"]],
            body: variantRows,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: {
              fillColor: [255, 20, 147],
              textColor: 255,
              fontSize: 9,
              fontStyle: "bold",
            },
            columnStyles: {
              0: { cellWidth: 20 },
              1: { cellWidth: 22 },
              2: { cellWidth: 22 },
              3: { cellWidth: 22 },
            },
            theme: "grid",
          });

          if (item.images && item.images.length > 0) {
            try {
              const imgData = await this.toBase64(item.images[0]);
              doc.addImage(
                imgData,
                "JPEG",
                margin + 5,
                y + 5,
                imageWidth,
                imageHeight,
                undefined,
                "FAST"
              );
            } catch (e) {
              doc.setFillColor(230, 230, 230);
              doc.rect(margin + 5, y + 5, imageWidth, imageHeight, "F");
              doc.setTextColor(150, 150, 150);
              doc.setFontSize(8);
              doc.text(
                "Image not\navailable",
                margin + 10,
                y + imageHeight / 2
              );
            }
          }

          y += imageHeight + 45;
        }

        doc.save("products-catalog.pdf");
      });
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
    this.router.navigate(["/edit-product", product.id]);
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
      .subscribe((result) => {
        if (result) {
          this.productService
            .deleteProduct(product.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.getProductsList(this.category);
            });
        }
      });
  }
}
