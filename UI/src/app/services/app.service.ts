// src/app/services/product.service.ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { LoggedIn } from "../models/app.model";
interface JWT {
  message: string;
  token: string;
}

@Injectable({
  providedIn: "root",
})
export class AppService {
  private http = inject(HttpClient);
  isLoggedIn$ = new BehaviorSubject<boolean>(false);
  login(username: string, password: string): Observable<JWT> {
    return this.http.post<JWT>(
      `${environment.apiURL}/api/login`,
      {
        username,
        password,
      },
      { withCredentials: true }
    );
  }

  logout() {
    return this.http.post<JWT>(
      `${environment.apiURL}/api/logout`,
      {},
      { withCredentials: true }
    );
  }

  checkLoggedIn() {
    return this.http.get<LoggedIn>(`${environment.apiURL}/api/auth/check`, {
      withCredentials: true,
    });
  }

  sendMail(params) {
    return this.http.post(`${environment.apiURL}/sendMail`, params);
  }
}
