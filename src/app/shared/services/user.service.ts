import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Using the base URL from environment configuration
  private readonly apiUrl = 'http://localhost:3000';
  private readonly currentUserSubject = new BehaviorSubject<any>(null);
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  /**
   * Updates the current user in the application state
   */
  setCurrentUser(user: any) {
    this.currentUserSubject.next(user);
  }

  /**
   * Gets the current user from application state
   */
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }
}
