// src/app/services/product.service.ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Product, ProductPayload } from "../models/app.model";

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private http = inject(HttpClient);

  getProducts(): Observable<Product> {
    return this.http.get<Product>(`${environment.apiURL}/products-list`);
  }

  getAProduct(id): Observable<{ items: ProductPayload }> {
    return this.http.get<{ items: ProductPayload }>(
      `${environment.apiURL}/product/${id}`
    );
  }

  addProduct(data: FormData): Observable<any[]> {
    return this.http.post<any[]>(`${environment.apiURL}/add-product`, data, {
      withCredentials: true,
    });
  }

  updateProduct(data: FormData ,id:string): Observable<any[]> {
    return this.http.post<any[]>(`${environment.apiURL}/update-product/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteProduct(id: string): Observable<any[]> {
    return this.http.delete<any[]>(
      `${environment.apiURL}/delete-product/${id}`,
      {
        withCredentials: true,
      }
    );
  }
}
