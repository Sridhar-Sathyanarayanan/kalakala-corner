// src/app/services/product.service.ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private http = inject(HttpClient);

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiURL}/products-list`);
  }

  addProduct(product): Observable<any[]> {
    return this.http.post<any[]>(`${environment.apiURL}/add-product`, {
      withCredentials: true,
    });
  }
}
