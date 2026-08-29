import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SessionService } from './core/session.service';
import { ChatWidget } from './shared/chat-widget/chat-widget';
import { Header } from './shared/header/header';

@Component({
  imports: [RouterOutlet, Header, ChatWidget],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  // Injecting SessionService here (via the Header, and transitively everywhere) is enough
  // to construct the singleton and kick off its eager session check — see whenReady.
  private session = inject(SessionService);
}
