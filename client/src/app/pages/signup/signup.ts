import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { SessionService } from '../../core/session.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-signup',
  styleUrl: './signup.scss',
  templateUrl: './signup.html',
})
export class Signup {
  private session = inject(SessionService);
  private router = inject(Router);

  protected name = signal('');
  protected email = signal('');
  protected password = signal('');
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.password().length < 8) {
      this.errorMessage.set('Password must be at least 8 characters.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.session.signUp(this.email(), this.password(), this.name());
      this.router.navigateByUrl('/');
    } catch (err) {
      const status = (err as HttpErrorResponse).status;
      this.errorMessage.set(
        status === 409 ? 'An account with this email already exists.' : 'Could not create your account.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
