import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { firstValueFrom } from "rxjs";
import { Product, ProductPayload } from "../models/app.model";
import { AppService } from "../services/app.service";
import { ProductService } from "../services/product.service";
import { ConfirmationModalComponent } from "../shared/confirmation/confirmation-modal.component";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { ProductDetailsComponent } from "./product-details/product-details.component";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";

interface ProductWithPricing extends ProductPayload {
  displayMinPrice?: number;
  displayMaxPrice?: number;
  originalMinPrice?: number;
  originalMaxPrice?: number;
  maxDiscountPercent?: number;
  hasDiscount?: boolean;
}

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrls: ["./catalogue.component.scss"],
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit {
  products: ProductWithPricing[] = [];
  category: string;
  categoryTitle = "";

  constructor(
    private productService: ProductService,
    public appService: AppService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.category = params.get("category");
      if (!this.category) {
        this.router.navigate(["/catalogue/all"]);
        return;
      }
      this.productService.getCategories().subscribe((data) => {
        const categoryTitle = data.items.find((d) => d.path === this.category);
        this.categoryTitle = categoryTitle ? categoryTitle.name : "All Items";
      });
      this.getProductsList(this.category);
    });
  }

  getProductsList(category?: string) {
    this.products = [];
    this.productService.getProducts(category).subscribe((data: Product) => {
      this.products = data.items;
      this.products.forEach((p) => {
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const regularPrices: number[] = [];
          const discountedPrices: number[] = [];
          const priceDiscountPairs: { original: number; discounted: number }[] =
            [];

          // Separate regular prices and discounted prices
          p.variants.forEach((variant) => {
            const price = Number(variant.price);
            const discountedPrice = Number(variant.discountedPrice);

            // Collect regular prices
            if (!isNaN(price) && price > 0) {
              regularPrices.push(price);
            }

            // Collect discounted prices (only if valid and less than original)
            if (!isNaN(discountedPrice) && discountedPrice > 0) {
              discountedPrices.push(discountedPrice);

              // Store pairs for discount calculation
              if (!isNaN(price) && price > 0 && discountedPrice < price) {
                priceDiscountPairs.push({
                  original: price,
                  discounted: discountedPrice,
                });
              }
            }
          });

          // Determine minimum price: lowest of (all discounted prices, or all regular prices)
          const allAvailablePrices = [...discountedPrices, ...regularPrices];
          if (allAvailablePrices.length > 0) {
            p.displayMinPrice = Math.min(...allAvailablePrices);
          }

          // Determine maximum price: highest regular price
          if (regularPrices.length > 0) {
            p.displayMaxPrice = Math.max(...regularPrices);
          }

          // Store original min/max prices (from regular prices only)
          if (regularPrices.length > 0) {
            p.originalMinPrice = Math.min(...regularPrices);
            p.originalMaxPrice = Math.max(...regularPrices);
          }

          // Calculate maximum discount percentage
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
    });
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

  waitForImagesToLoad(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll("img"));
    const promises = images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // resolve even if image fails
      });
    });
    return Promise.all(promises).then(() => {});
  }

  downloadPDF(): void {
    this.productService.downloadPDF().subscribe(async (data) => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 15,
        imageWidth = 50,
        imageHeight = 40;
      let y = 40;

      // Header
      doc.setFontSize(16);
      doc.text("Products Catalog", doc.internal.pageSize.getWidth() / 2, 15, {
        align: "center",
      });

      for (const item of data.items) {
        // If not enough space left, add a new page
        if (y + imageHeight + 30 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        // Draw card border
        doc.setDrawColor(180);
        doc.roundedRect(
          margin,
          y,
          doc.internal.pageSize.getWidth() - 2 * margin,
          imageHeight + 30,
          4,
          4
        );

        // Product Name (bold)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(item.name, margin + imageWidth + 10, y + 10);

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(
          item.desc,
          doc.internal.pageSize.getWidth() - (margin + imageWidth + 15)
        );
        doc.text(descLines, margin + imageWidth + 10, y + 18);

        // Variants Table with discount support
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
          didDrawCell: (data) => {},
        });

        // Add S3 Image (left side)
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
            // Draw placeholder if image fails
            doc.setFillColor(230, 230, 230);
            doc.rect(margin + 5, y + 5, imageWidth, imageHeight, "F");
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text("Image not\navailable", margin + 10, y + imageHeight / 2);
          }
        }

        y += imageHeight + 45; // Spacing for next card
      }

      doc.save("products-catalog.pdf");
    });
  }

  // Utility: Convert image URL to base64 string
  private async toBase64(input: string | Blob): Promise<string> {
    let blob: Blob;
    if (typeof input === "string") {
      // Prefer fetching via server proxy which returns a blob
      try {
        blob = await firstValueFrom(this.productService.fetchS3Image(input));
      } catch (err) {
        // Fallback to client fetch if server proxy fails
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

  openProductModal(product: ProductPayload) {
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

  edit(product: ProductPayload) {
    this.router.navigate(["/edit-product", product.id]);
  }

  delete(product: ProductPayload) {
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message:
          "Are you sure you want to delete the product? (Note: This will permanently delete the product from database)",
        button: "Delete",
      },
      width: "85%",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.productService.deleteProduct(product.id).subscribe(() => {
          this.getProductsList(this.category);
        });
      }
    });
  }
}
