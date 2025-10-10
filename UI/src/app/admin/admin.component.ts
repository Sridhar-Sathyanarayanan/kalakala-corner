import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialStandaloneModules } from '../shared/material-standalone';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image?: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialStandaloneModules],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {
  products: Product[] = [
    { id: 1, name: 'T-Shirt', price: 499, category: 'Clothing', image: '' },
    { id: 2, name: 'Mug', price: 299, category: 'Accessories', image: '' },
  ];

  newProduct: Partial<Product> = {
    name: '',
    price: null,
    category: '',
    image: '',
  };

  addProduct() {
    if (!this.newProduct.name || !this.newProduct.price || !this.newProduct.category) {
      alert('Please fill all fields.');
      return;
    }
    const id = this.products.length ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
    this.products.push({ id, ...this.newProduct } as Product);
    this.newProduct = { name: '', price: null, category: '', image: '' };
  }

  removeProduct(id: number) {
    if (confirm('Are you sure you want to remove this product?')) {
      this.products = this.products.filter(p => p.id !== id);
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.newProduct.image = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}
