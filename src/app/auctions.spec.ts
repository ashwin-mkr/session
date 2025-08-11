import { TestBed } from '@angular/core/testing';

import { Auctions } from './auctions';

describe('Auctions', () => {
  let service: Auctions;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Auctions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
