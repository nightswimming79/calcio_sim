import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimSequenceComponent } from './sim-sequence.component';

describe('SimSequenceComponent', () => {
  let component: SimSequenceComponent;
  let fixture: ComponentFixture<SimSequenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimSequenceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimSequenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
