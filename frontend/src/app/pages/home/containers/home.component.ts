import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SkeletonComponent } from '../../../shared/skeleton.component';
import { TagComponent } from '../../../shared/tag.component';
import { HomeFacade } from '../facades/home.facade';
import { FLUXO_ETAPAS } from '../models/home.model';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [CommonModule, RouterModule, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  readonly etapas = FLUXO_ETAPAS;

  constructor(public facade: HomeFacade) {}

  ngOnInit(): void {
    this.facade.load();
  }

  retryStatus(): void {
    this.facade.load();
  }
}
