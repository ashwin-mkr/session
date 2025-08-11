import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartSession } from './start-session';

describe('StartSession', () => {
  let component: StartSession;
  let fixture: ComponentFixture<StartSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartSession]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartSession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
