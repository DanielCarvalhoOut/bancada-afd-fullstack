import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EditorStateService } from '../../core/services/editor-state.service';
import { AutomatonKind } from '../../core/models/api.model';
import { ThemeService } from '../../core/services/theme.service';

/** Portal: escolhe entre o espaço determinístico (AFD) e o não determinístico (AFN). */
@Component({
  selector: 'app-portal',
  standalone: true,
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
