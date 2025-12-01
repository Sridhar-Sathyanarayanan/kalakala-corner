import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Testimonial, TestimonialResponse } from "../models/app.model";

@Injectable({
  providedIn: "root",
})
export class TestimonialsService {
  private http = inject(HttpClient);

  getTestimonials(): Observable<TestimonialResponse> {
    return this.http.get<TestimonialResponse>(
      `${environment.apiURL}/testimonials-list`
    );
  }

  addTestimonial(testimonial: {
    category: string;
    product: string;
    "product-id": string;
    comments: string;
    rating: number;
  }): Observable<Testimonial> {
    return this.http.post<Testimonial>(
      `${environment.apiURL}/add-testimonial`,
      testimonial,
      {
        withCredentials: true,
      }
    );
  }

  updateTestimonial(
    id: number,
    testimonial: {
      category?: string;
      product?: string;
      "product-id"?: string;
      comments?: string;
      rating?: number;
    }
  ): Observable<Testimonial> {
    return this.http.put<Testimonial>(
      `${environment.apiURL}/update-testimonial/${id}`,
      testimonial,
      {
        withCredentials: true,
      }
    );
  }

  deleteTestimonial(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiURL}/delete-testimonial/${id}`,
      {
        withCredentials: true,
      }
    );
  }
}
