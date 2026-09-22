import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimLooseBallComponent } from './sim-loose-ball.component';

describe('SimLooseBallComponent', () => {
  let component: SimLooseBallComponent;
  let fixture: ComponentFixture<SimLooseBallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimLooseBallComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimLooseBallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
