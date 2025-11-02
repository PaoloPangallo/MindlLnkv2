import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivacyPanelComponent } from './privacy-panel.component';

describe('PrivacyPanelComponent', () => {
  let component: PrivacyPanelComponent;
  let fixture: ComponentFixture<PrivacyPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrivacyPanelComponent]
    });
    fixture = TestBed.createComponent(PrivacyPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
