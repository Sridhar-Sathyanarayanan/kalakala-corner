import { Component, OnInit, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

import { MaterialStandaloneModules } from "../shared/material-standalone";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialStandaloneModules],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit, OnDestroy {
  // Angular 20 signals for reactive state
  currentIndex = signal(0);
  autoplayTimer: any;

  catalogItems = [
    {
      name: "Eco-friendly Wooden Gifts",
      desc: "Sustainable, handmade — perfect for special moments.",
    },
    {
      name: "Wooden Utility Articles",
      desc: "Home & office pieces with natural charm.",
    },
    {
      name: "Thanjavur Paintings",
      desc: "Traditional gold-foil paintings with a modern twist.",
    },
    {
      name: "Wooden Pooja Items",
      desc: "Devotional pieces crafted with care.",
    },
    {
      name: "Kids Eco Toys",
      desc: "Safe, durable, and bright toys for little ones.",
    },
    {
      name: "Textile & Embroidery",
      desc: "Hand-stitched fabrics and accessories.",
    },
  ];

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
    { image: "assets/images/slide11.jpeg", title: "Origami & More" },
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

  ngOnInit() {
    // autoplay slides — gentle cadence
    this.autoplayTimer = setInterval(() => {
      this.currentIndex.set((this.currentIndex() + 1) % this.slides.length);
    }, 4200);
  }

  ngOnDestroy() {
    clearInterval(this.autoplayTimer);
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
}
