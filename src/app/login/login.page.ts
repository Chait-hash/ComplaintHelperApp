import { Component } from "@angular/core";
import { NavigationExtras, Router } from "@angular/router";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { LoadingController } from "@ionic/angular";
import { LoginService } from "../shared/services/login.service";
import { environment } from "../../environments/environment";
import { ToastService } from "../shared/services/toast.service";
import { StorageService } from "../shared/services/storage.service";
import { TokenService } from "../shared/services/token.service";
import { UserService } from '../shared/services/user.service';

@Component({
  selector: "app-login",

  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  loginForm!: FormGroup;
  loading = false;
  showPassword = false;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private loginService: LoginService,
    private toastService: ToastService,
    private storageService: StorageService,
    private tokenService: TokenService,
    private userService : UserService
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    this.loginForm = this.formBuilder.group({
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
      ],
    });
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    const loading = await this.loadingController.create({
      message: "Signing in...",
      spinner: "crescent",
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

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
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
      console.error("Authentication error:", error);
      // Handle specific error cases here
      throw error;
    }
  }

  private async handleEmailLoginSuccess(data: any, keycloakCredentials: {}) {
    const loading = await this.loadingController.create({
      message: 'Completing login...',
      spinner: 'crescent'
    });
    
    try {
      await loading.present();
      
      console.log('Login successful, storing token...');
      this.toastService.presentToast("Authentication successful", 2000, "success");
      
      // Store the token and wait for it to complete
      const token = data.access_token;
      console.log('Token received:', token ? 'Token exists' : 'Token is empty');
      
      if (!token) {
        throw new Error('No access token received');
      }
      
      // Store token and session state
      await Promise.all([
        this.storageService.setItem("session_state", data.session_state),
        this.tokenService.setToken(token)
      ]);
      
      console.log('Token stored in storage');
      
      // Decode token to get user info
      const decodedToken = jwtDecode<{ 
        sub: string; 
        email?: string; 
        given_name?: string; 
        family_name?: string 
      }>(token);

      if (!decodedToken.sub) {
        throw new Error('Invalid token: missing sub claim');
      }
      
      // Store user ID
      await this.tokenService.setDecodedTokenToStorage(decodedToken.sub);
      
      // Update login state
      await this.storageService.removeItem("user_has_logged_out");
      
      // Prepare navigation extras with user data
      const navigationExtras: NavigationExtras = {
        state: {
          email: this.loginForm.value.userEmail,
          phoneNumber: '',
          token: token,
          flag: 'email-login',
        },
      };

      console.log('Navigation to home starting...');
      await this.router.navigate(["/home"], navigationExtras);
      console.log('Navigation to home completed');
    } catch (error) {
      console.error("Error handling login success:", error);
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
