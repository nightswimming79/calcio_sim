import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimTiroComponent } from './sim-tiro.component';

describe('SimTiroComponent', () => {
  let component: SimTiroComponent;
  let fixture: ComponentFixture<SimTiroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimTiroComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimTiroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
