import { Component, OnInit, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Subject, takeUntil } from "rxjs";

import { MaterialStandaloneModules } from "../shared/material-standalone";
import { TestimonialsService } from "../services/testimonials.service";
import { ProductService } from "../services/product.service";
import { Testimonial, ProductPayload } from "../models/app.model";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialStandaloneModules],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent implements OnInit, OnDestroy {
  // Angular 20 signals for reactive state
  currentIndex = signal(0);
  currentTestimonialIndex = signal(0);
  autoplayTimer: any;
  testimonialTimer: any;
  private destroy$ = new Subject<void>();
  
  testimonials: Testimonial[] = [];
  testimonialProductImages: Map<number, string> = new Map(); // Simple image URLs

  slides = [
    { image: "assets/images/slide1.jpeg", title: "Traditional Dolls" },
    { image: "assets/images/slide2.jpeg", title: "Handmade Earrings" },
    { image: "assets/images/slide3.jpeg", title: "Vibrant Paintings" },
    { image: "assets/images/slide4.jpeg", title: "Clay Pottery" },
    { image: "assets/images/slide5.jpeg", title: "Textile Crafts" },
    { image: "assets/images/slide6.jpeg", title: "Origami & More" },
    { image: "assets/images/slide7.jpeg", title: "Origami & More" },
    { image: "assets/images/slide8.jpeg", title: "Origami & More" },
    { image: "assets/images/slide9.jpeg", title: "Origami & More" },
    { image: "assets/images/slide10.jpeg", title: "Origami & More" },
  ];
  reasons = [
    {
      icon: "favorite",
      desc: "Profound impact on both individuals and communities",
      color: "#e91e63",
    },
    {
      icon: "eco",
      desc: "Promoting creativity, well-being & Cultural preservation",
      color: "#4caf50",
    },
    {
      icon: "palette",
      desc: "Support local economies of artisans",
      color: "#6c5ce7",
    },
    {
      icon: "check_circle",
      desc: "Creating something with one’s own hands boosts self-esteem and confidence",
      color: "#ff9800",
    },
    {
      icon: "pie_chart",
      desc: "Traditional crafts and art forms  preserve  cultural heritage",
      color: "#11ff00",
    },
    {
      icon: "toys",
      desc: "Non-verbal way to process emotions, making them valuable in art therapy for depression and trauma",
      color: "#f048b5",
    },
  ];
  dyk = [
    {
      desc: "Traditional wooden crafts, Handmade with a history dating back 400 years are eco-friendly with intricate carvings, designs and depicts Traditional themes.",

      
    },
    {
      desc: "The classical style South Indian Thanjavur, Tamilnadu Gold foil painting dates back to the 17th century and characterized with rich colours, Gesso work, iconic themes . The paintings are made with intricate designs using Gold foil-22 carat and preserved as valuable antiques.",
      image: "assets/images/collections/decor.jpg",
      
    },
    {
      desc: "Madhubani (Mithila) Painting of Bihar is an ancient art form uses natural dyes and depicts folklore and mythology.",
      image: "assets/images/collections/wearable.jpg",
      
    },
    {
      desc: "Dhokra Metal Craft was Practiced by tribal artisans in central India, this lost-wax casting technique dates back to prehistoric times.",
      image: "assets/images/collections/upcycled.jpg",
      
    },
  ];

  // small helper to get transform in template
  get translateX() {
    return `translateX(-${this.currentIndex() * 100}%)`;
  }

  constructor(
    private testimonialsService: TestimonialsService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    // Load testimonials
    this.testimonialsService.getTestimonials()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.testimonials = res.items || [];
        // Load product images for each testimonial
        this.loadTestimonialProductImages();
      });

    // autoplay slides — gentle cadence
    this.autoplayTimer = setInterval(() => {
      this.currentIndex.set((this.currentIndex() + 1) % this.slides.length);
    }, 4200);

    // autoplay testimonials
    this.testimonialTimer = setInterval(() => {
      if (this.testimonials.length > 0) {
        this.currentTestimonialIndex.set(
          (this.currentTestimonialIndex() + 1) % this.testimonials.length
        );
      }
    }, 5000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.autoplayTimer);
    clearInterval(this.testimonialTimer);
  }

  nextSlide() {
    this.currentIndex.set((this.currentIndex() + 1) % this.slides.length);
  }

  prevSlide() {
    this.currentIndex.set(
      (this.currentIndex() - 1 + this.slides.length) % this.slides.length
    );
  }

  goToSlide(i: number) {
    this.currentIndex.set(i);
  }

  nextTestimonial() {
    if (this.testimonials.length > 0) {
      this.currentTestimonialIndex.set(
        (this.currentTestimonialIndex() + 1) % this.testimonials.length
      );
    }
  }

  prevTestimonial() {
    if (this.testimonials.length > 0) {
      this.currentTestimonialIndex.set(
        (this.currentTestimonialIndex() - 1 + this.testimonials.length) %
          this.testimonials.length
      );
    }
  }

  getStarArray(rating: number): boolean[] {
    return Array(5)
      .fill(false)
      .map((_, i) => i < Math.floor(rating));
  }

  loadTestimonialProductImages(): void {
    this.testimonials.forEach((testimonial) => {
      if (testimonial["product-id"]) {
        this.productService.getAProduct(testimonial["product-id"])
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              const product = res.items;
              if (product && product.images && product.images.length > 0) {
                // Use the first image URL directly (like catalogue does)
                this.testimonialProductImages.set(testimonial.id, product.images[0]);
              }
            },
            error: (error) => {
              console.error(`Error loading product for testimonial ${testimonial.id}:`, error);
            }
          });
      }
    });
  }
}
