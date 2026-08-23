import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CompareService } from '../../core/compare.service';
import { SessionService } from '../../core/session.service';

@Component({
  imports: [RouterLink],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  protected session = inject(SessionService);
  protected compare = inject(CompareService);
  private router = inject(Router);

  async signOut(): Promise<void> {
    await this.session.signOut();
    this.router.navigateByUrl('/');
  }
}
