import { Component } from "@angular/core";
import { NavigationExtras, Router } from "@angular/router";
import { environment } from "src/environments/environment";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { LoadingController } from "@ionic/angular";

@Component({
  selector: "app-login",

  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  loginForm: FormGroup;
  loading = false;
  
  showPassword = false;

  constructor(
    private router: Router, 
    private fb: FormBuilder,
    private loadingCtrl: LoadingController
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    this.loginForm = this.fb.group({
      userEmail: ["", [Validators.required, Validators.email]],
      userPassword: [
        "",
        [
          Validators.required,
          Validators.pattern(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*\\/])(?=.{8,})/
          ),
          Validators.minLength(8),
        ],
      ]
    });
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Signing in...',
      spinner: 'crescent'
    });
    
    try {
      await loading.present();
      await this.handleEmailLogin();
    } catch (error: any) {
      console.error("Login error:", error);
      // Show error message to user
      // You can use a toast service here
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  async onForgotPassword() {
    // Navigate to forgot password page
    this.router.navigate(['/forgot-password']);
  }

  onSignUp() {
    // Navigate to signup page
    this.router.navigate(['/signup']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private async handleEmailLogin() {
    try {
      const keycloakCredentials = {
        client_id: environment.clientId,
        grant_type: "password",
        username: this.loginForm.value.userEmail,
        password: this.loginForm.value.userPassword,
        client_secret: environment.clientSecretStaging,
      };

      const keycloakUrl = environment.keycloakUrlStaging;
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const response = await axios.post(
        keycloakUrl,
        this.toFormUrlEncoded(keycloakCredentials),
        { headers }
      );

      // Handle successful login
      await this.handleEmailLoginSuccess(response.data, keycloakCredentials);
      console.log("Padh lo", response.data);
    } catch (error) {
      console.error('Authentication error:', error);
      // Handle specific error cases here
      throw error;
    }
  }

  private async handleEmailLoginSuccess(data: any, keycloakCredentials: {}) {
    try {
      const token = data.access_token;
      // Store the token in your preferred storage (e.g., Ionic Storage)
      // await this.storageService.set('auth_token', token);
      
      // Decode the token to get user information
      const decodedToken = jwtDecode<{ sub: string; email: string; name?: string }>(token);
      
      // Prepare navigation extras with user data
      const navigationExtras: NavigationExtras = {
        state: {
          email: decodedToken.email || this.loginForm.value.userEmail,
          name: decodedToken.name || '',
          token: token,
          flag: "email-login",
        },
      };

      // Navigate to the main app area
      this.router.navigate(['/home'], navigationExtras);
    } catch (error) {
      console.error('Error handling login success:', error);
      throw error;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  private toFormUrlEncoded(obj: any): string {
    const formBody: string[] = [];
    for (const property in obj) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(obj[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    return formBody.join("&");
  }
}
