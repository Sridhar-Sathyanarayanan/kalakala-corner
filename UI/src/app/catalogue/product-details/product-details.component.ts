import { CommonModule } from "@angular/common";
import { Component, HostListener, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MaterialStandaloneModules } from "../../shared/material-standalone";

interface PriceRange {
  displayMinPrice: number;
  displayMaxPrice: number;
  originalMinPrice: number | null;
  originalMaxPrice: number | null;
  maxDiscountPercent: number;
  hasDiscount: boolean;
}

@Component({
  selector: "app-product-details",
  standalone: true,
  imports: [CommonModule, MaterialStandaloneModules],
  templateUrl: "./product-details.component.html",
  styleUrl: "./product-details.component.scss",
})
export class ProductDetailsComponent implements OnInit {
  currentIndex = 0;
  priceRange: PriceRange = {
    displayMinPrice: 0,
    displayMaxPrice: 0,
    originalMinPrice: null,
    originalMaxPrice: null,
    maxDiscountPercent: 0,
    hasDiscount: false,
  };
  hasAnyOfferPrice = false;
  displayedColumns: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<ProductDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.calculatePriceRange();
    this.checkForOfferPrices();
    this.setDisplayedColumns();
  }

  /**
   * Check if any variants have offer prices
   */
  checkForOfferPrices(): void {
    if (!this.data.variants || this.data.variants.length === 0) {
      this.hasAnyOfferPrice = false;
      return;
    }

    this.hasAnyOfferPrice = this.data.variants.some((variant: any) => {
      const discountedPrice = this.parsePrice(variant.discountedPrice);
      return discountedPrice !== null && discountedPrice > 0;
    });
  }

  /**
   * Set displayed columns based on whether offer prices exist
   */
  setDisplayedColumns(): void {
    this.displayedColumns = this.hasAnyOfferPrice
      ? ["size", "price", "discountedPrice"]
      : ["size", "price"];
  }

  /**
   * Calculate price range with the same logic as catalogue component
   * - displayMinPrice: lowest price from (all discounted prices OR all regular prices)
   * - displayMaxPrice: highest regular price
   * - originalMinPrice/Max: min and max of regular prices only
   * - maxDiscountPercent: highest discount percentage
   */
  calculatePriceRange(): void {
    if (!this.data.variants || this.data.variants.length === 0) {
      return;
    }

    const regularPrices: number[] = [];
    const discountedPrices: number[] = [];
    const priceDiscountPairs: { original: number; discounted: number }[] = [];

    // Separate regular prices and discounted prices
    this.data.variants.forEach((variant: any) => {
      const price = this.parsePrice(variant.price);
      const discountedPrice = this.parsePrice(variant.discountedPrice);

      // Collect regular prices
      if (price !== null && price > 0) {
        regularPrices.push(price);
      }

      // Collect discounted prices (only if valid and less than original)
      if (discountedPrice !== null && discountedPrice > 0) {
        discountedPrices.push(discountedPrice);

        // Store pairs for discount calculation
        if (price !== null && price > 0 && discountedPrice < price) {
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
      this.priceRange.displayMinPrice = Math.min(...allAvailablePrices);
    }

    // Determine maximum price: highest regular price
    if (regularPrices.length > 0) {
      this.priceRange.displayMaxPrice = Math.max(...regularPrices);
    }

    // Store original min/max prices (from regular prices only)
    if (regularPrices.length > 0) {
      this.priceRange.originalMinPrice = Math.min(...regularPrices);
      this.priceRange.originalMaxPrice = Math.max(...regularPrices);
    }

    // Calculate maximum discount percentage
    this.priceRange.hasDiscount = priceDiscountPairs.length > 0;
    if (this.priceRange.hasDiscount) {
      const discountPercentages = priceDiscountPairs.map((pair) =>
        Math.round(((pair.original - pair.discounted) / pair.original) * 100)
      );
      this.priceRange.maxDiscountPercent = Math.max(...discountPercentages);
    } else {
      this.priceRange.maxDiscountPercent = 0;
    }
  }

  /**
   * Parse price string to number
   */
  private parsePrice(price: any): number | null {
    if (!price || price === "null" || price === "undefined" || price === "") {
      return null;
    }
    const parsed = parseFloat(price);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Calculate discount percentage for individual variant
   */
  calculateDiscount(originalPrice: any, discountedPrice: any): number {
    const original = this.parsePrice(originalPrice);
    const discounted = this.parsePrice(discountedPrice);

    if (original === null || discounted === null || original === 0) {
      return 0;
    }

    const discount = ((original - discounted) / original) * 100;
    return Math.round(discount);
  }

  /**
   * Check if price display should show range difference
   */
  shouldShowOriginalPrice(): boolean {
    if (!this.priceRange.hasDiscount) {
      return false;
    }

    return (
      this.priceRange.originalMinPrice !== this.priceRange.displayMinPrice ||
      this.priceRange.originalMaxPrice !== this.priceRange.displayMaxPrice
    );
  }

  /**
   * Navigate to next image
   */
  nextImage(): void {
    this.currentIndex = (this.currentIndex + 1) % this.data.images.length;
  }

  /**
   * Navigate to previous image
   */
  prevImage(): void {
    this.currentIndex =
      (this.currentIndex - 1 + this.data.images.length) %
      this.data.images.length;
  }

  /**
   * Close dialog
   */
  close(): void {
    this.dialogRef.close();
  }

  // Touch gesture support for mobile
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly SWIPE_THRESHOLD = 50;

  @HostListener("touchstart", ["$event"])
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  @HostListener("touchend", ["$event"])
  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    const swipeDistance = this.touchEndX - this.touchStartX;

    if (Math.abs(swipeDistance) > this.SWIPE_THRESHOLD) {
      if (swipeDistance < 0) {
        this.nextImage();
      } else {
        this.prevImage();
      }
    }
  }

  // Keyboard navigation
  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowLeft") {
      this.prevImage();
    } else if (event.key === "ArrowRight") {
      this.nextImage();
    } else if (event.key === "Escape") {
      this.close();
    }
  }
}
