import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EditorStateService } from '../../core/services/editor-state.service';
import { AutomatonKind } from '../../core/models/api.model';
import { ThemeService } from '../../core/services/theme.service';

/** Portal: escolhe entre o espaço determinístico (AFD) e o não determinístico (AFN), ou abre a Teoria. */
@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent {
  constructor(
    private router: Router,
    private editor: EditorStateService,
    public theme: ThemeService,
  ) {}

  enter(space: AutomatonKind): void {
    this.editor.space = space;
    this.router.navigate(['/bancada']);
  }
}
