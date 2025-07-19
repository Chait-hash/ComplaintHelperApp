import { Injectable } from '@angular/core';
import { 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpInterceptor,
  HttpResponse,
  HttpHeaders,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';
import { LogoutService } from '../services/logout.service';


@Injectable()
export class SHInterceptor implements HttpInterceptor {
    private consecutive401Count = 0;
    private readonly MAX_401_ATTEMPTS = 3;
    private readonly requestPath = '/content/subscription/request';
  
    constructor(
      private readonly tokenService: TokenService,
      private readonly router: Router,
      private readonly logoutService: LogoutService
    ) {
    }

    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        console.log('[SHInterceptor] Intercepting request to:', req.url);
        console.log('[SHInterceptor] Request method:', req.method);
        console.log('[SHInterceptor] Request headers:', req.headers);

        if (this.isPublicUrl(req.url)) {
            console.log('[SHInterceptor] Skipping token for public URL:', req.url);
            const clonedReq = req.clone({
                setHeaders: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            return next.handle(clonedReq);
        }

        // For authenticated requests
        console.log('[SHInterceptor] Checking for token for protected URL:', req.url);

        return from(this.tokenService.getToken().catch(err => {
            console.error('[SHInterceptor] Error getting token:', err);
            return null;
        })).pipe(
            mergeMap((token: string | null) => {
                console.log('[SHInterceptor] Token retrieved:', token ? 'Token exists' : 'No token found');

                if (!token) {
                    console.error('[SHInterceptor] No token found for authenticated request to:', req.url);
                    // Redirect to login if no token is found
                    this.router.navigate(['/login']);
                    throw new Error('No authentication token found');
                }

                console.log('[SHInterceptor] Adding token to request headers');
                
                // Create headers object and set the Authorization header
                const headers = new HttpHeaders({
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                });

                // Clone the request with the new headers
                const clonedReq = req.clone({
                    headers: headers,
                    withCredentials: true // Ensure credentials are sent with the request
                });
                
                console.log('[SHInterceptor] Request headers after clone:', clonedReq.headers.keys());

                console.log('[SHInterceptor] Sending request with headers:', clonedReq.headers);

                return next.handle(clonedReq).pipe(
                    tap(event => {
                        if (event instanceof HttpResponse) {
                            console.log('[SHInterceptor] Response received:', event.status, event.url);
                        }
                    }),
                    catchError((error: any) => {
                        if (error instanceof HttpErrorResponse) {
                        console.error('[SHInterceptor] Request error:', {
                            status: error.status,
                            statusText: error.statusText,
                            url: error.url || req.url,
                            message: error.message,
                            error: error.error
                        });

                        if (error.status === 401) {
                            console.log('[SHInterceptor] Handling 401 Unauthorized');
                            this.handleUnauthorized(error);
                        }
                    } else {
                        console.error('[SHInterceptor] Unknown error:', error);
                    }

                    // Re-throw the error so it can be handled by the service
                    throw error;
                    })
                );
            }),
            catchError(error => {
                console.error('[SHInterceptor] Error in interceptor pipeline:', error);
                // Continue with the original request (without token)
                return next.handle(req);
            })
        );
    }

    private isPublicUrl(url: string): boolean {
        const publicUrls = [
            '/auth/',
            '/api/auth/'
            // Add other public endpoints here
        ];
        
        return publicUrls.some(publicUrl => url.includes(publicUrl));
    }
  
    private isRequestEndpoint(fullUrl: string): boolean {
      try {
        // base origin is only used if fullUrl is relative
        const parsed = new URL(fullUrl, window.location.origin);
        const path = parsed.pathname;
        return path === this.requestPath || path === this.requestPath + '/';
      } catch {
        // If URL parsing fails, don't add header
        return false;
      }
    }
  
    private isLogoutInProgress = false;
  
    private async handleUnauthorized(error: any) {
      if (this.isLogoutInProgress) return; // Prevent duplicate logout attempts
      
      // Reset the 401 counter if it exceeds max attempts
      this.consecutive401Count++;
      if (this.consecutive401Count >= this.MAX_401_ATTEMPTS) {
        console.log('[SHInterceptor] Max 401 attempts reached, logging out...');
        this.logoutService.logout();
        this.router.navigate(['/login']);
        this.consecutive401Count = 0; // Reset counter after logout
        return;
      }
  
      console.log('[SHInterceptor] Handling unauthorized request');
      
      try {
        const status = await this.tokenService.checkTokenExpiry();
  
        if (status.expired) {
          console.log('[SHInterceptor] Token expired, attempting to refresh...');
          const refreshSuccessful = await this.tokenService.tryRefreshToken();
          
          if (!refreshSuccessful) {
            console.log('[SHInterceptor] Token refresh failed, logging out...');
            this.logoutService.logout();
            this.router.navigate(['/login']);
          } else {
            console.log('[SHInterceptor] Token refreshed successfully');
          }
        } else {
          this.consecutive401Count++;
          console.log('Interceptor working trying attempts...', this.consecutive401Count);
          if (this.consecutive401Count >= this.MAX_401_ATTEMPTS) {
            console.error(
              'Multiple 401 errors detected — Logging out as fallback.'
            );
            // await this.logoutAndNavigate();
          }
        }
      } catch (err) {
        console.error('Error in token validation:', err);
        await this.logoutAndNavigate(); // Ensures unexpected issues result in logout
      }
    }
  
    private async logoutAndNavigate() {
      if (this.isLogoutInProgress) return;
      this.isLogoutInProgress = true;
      await this.logoutService.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
      this.isLogoutInProgress = false;
    }
  }
