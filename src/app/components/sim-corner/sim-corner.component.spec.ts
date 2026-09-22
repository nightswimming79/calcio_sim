import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimCornerComponent } from './sim-corner.component';

describe('SimCornerComponent', () => {
  let component: SimCornerComponent;
  let fixture: ComponentFixture<SimCornerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimCornerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimCornerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
