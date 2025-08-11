import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveAuction } from './live-auction';

describe('LiveAuction', () => {
  let component: LiveAuction;
  let fixture: ComponentFixture<LiveAuction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveAuction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveAuction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
