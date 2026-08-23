import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SessionService } from '../../core/session.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private session = inject(SessionService);
  private router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);

  async submit(): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.session.signIn(this.email(), this.password());
      this.router.navigateByUrl('/');
    } catch {
      this.errorMessage.set('Invalid email or password.');
    } finally {
      this.submitting.set(false);
    }
  }
}
