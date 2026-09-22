import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimAzioneFullComponent } from './sim-azione-full.component';

describe('SimAzioneFullComponent', () => {
  let component: SimAzioneFullComponent;
  let fixture: ComponentFixture<SimAzioneFullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimAzioneFullComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimAzioneFullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
