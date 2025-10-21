import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphViewComponent } from './graph-view.component';

describe('GraphViewComponent', () => {
  let component: GraphViewComponent;
  let fixture: ComponentFixture<GraphViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GraphViewComponent]
    });
    fixture = TestBed.createComponent(GraphViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
