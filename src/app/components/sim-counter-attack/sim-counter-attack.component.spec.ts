import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimCounterAttackComponent } from './sim-counter-attack.component';

describe('SimCounterAttackComponent', () => {
  let component: SimCounterAttackComponent;
  let fixture: ComponentFixture<SimCounterAttackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimCounterAttackComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimCounterAttackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
