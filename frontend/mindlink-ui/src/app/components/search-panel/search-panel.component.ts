import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { GraphFilterService } from '../../services/graph-filter.service';
import { FormsModule } from "@angular/forms";
import { CommonModule, NgIf, NgFor } from "@angular/common";

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [FormsModule, CommonModule, NgIf, NgFor],
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.scss']
})
export class SearchPanelComponent {
  query = '';
  results: any[] = [];
  isLoading = false;
  noResults = false;

  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private graphFilterService: GraphFilterService
  ) {
    // 🔹 pipeline di ricerca reattiva
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => this.searchIdeas(q))
      )
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.results = res.results || [];
          this.noResults = !this.results.length && !!this.query.trim();
        },
        error: () => {
          this.isLoading = false;
          this.results = [];
        },
      });
  }

  onSearchChange() {
    this.graphFilterService.setSearchQuery(this.query);
    if (this.query.trim().length > 1) {
      this.isLoading = true;
      this.searchSubject.next(this.query.trim());
    } else {
      this.results = [];
      this.noResults = false;
    }
  }

  searchIdeas(q: string) {
    return this.http.get(`/api/ideas/search/?q=${encodeURIComponent(q)}`);
  }

  clearSearch() {
    this.query = '';
    this.results = [];
    this.noResults = false;
    this.graphFilterService.setSearchQuery('');
  }

  selectResult(result: any) {
    this.query = result.title;
    this.graphFilterService.setSearchQuery(result.title);
    this.results = [];
  }
}
