import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the main title', () => {
    const titleElement = fixture.debugElement.query(By.css('.hero-title'));
    expect(titleElement.nativeElement.textContent).toBe(
      'Welcome to eFootball Tournament Manager'
    );
  });

  it('should display the subtitle with description', () => {
    const subtitleElement = fixture.debugElement.query(
      By.css('.hero-subtitle')
    );
    expect(subtitleElement.nativeElement.textContent.trim()).toContain(
      'Organize and manage your eFootball tournaments'
    );
  });

  it('should have navigation buttons to schedule and standings', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.hero-actions .btn'));
    expect(buttons.length).toBe(2);

    const scheduleButton = buttons.find((btn) =>
      btn.nativeElement.textContent.trim().includes('View Schedule')
    );
    const standingsButton = buttons.find((btn) =>
      btn.nativeElement.textContent.trim().includes('View Standings')
    );

    expect(scheduleButton).toBeTruthy();
    expect(standingsButton).toBeTruthy();
  });

  it('should have correct router links for navigation buttons', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.hero-actions .btn'));

    const scheduleButton = buttons.find((btn) =>
      btn.nativeElement.textContent.trim().includes('View Schedule')
    );
    const standingsButton = buttons.find((btn) =>
      btn.nativeElement.textContent.trim().includes('View Standings')
    );

    expect(
      scheduleButton?.nativeElement.getAttribute('ng-reflect-router-link')
    ).toBe('/schedule');
    expect(
      standingsButton?.nativeElement.getAttribute('ng-reflect-router-link')
    ).toBe('/standings');
  });

  it('should display features section with title', () => {
    const featuresTitle = fixture.debugElement.query(By.css('.features-title'));
    expect(featuresTitle.nativeElement.textContent).toBe('Tournament Features');
  });

  it('should display four feature cards', () => {
    const featureCards = fixture.debugElement.queryAll(By.css('.feature-card'));
    expect(featureCards.length).toBe(4);
  });

  it('should display correct feature titles', () => {
    const featureTitles = fixture.debugElement.queryAll(
      By.css('.feature-title')
    );
    const titleTexts = featureTitles.map((title) =>
      title.nativeElement.textContent.trim()
    );

    expect(titleTexts).toContain('Player Management');
    expect(titleTexts).toContain('Automatic Scheduling');
    expect(titleTexts).toContain('Live Standings');
    expect(titleTexts).toContain('Playoff System');
  });

  it('should display feature descriptions', () => {
    const featureDescriptions = fixture.debugElement.queryAll(
      By.css('.feature-description')
    );
    expect(featureDescriptions.length).toBe(4);

    const playerManagementDesc = featureDescriptions.find((desc) =>
      desc.nativeElement.textContent.includes('Minimum 5 players required')
    );
    expect(playerManagementDesc).toBeTruthy();
  });

  it('should have admin section with title and description', () => {
    const adminTitle = fixture.debugElement.query(By.css('.admin-title'));
    const adminDescription = fixture.debugElement.query(
      By.css('.admin-description')
    );

    expect(adminTitle.nativeElement.textContent).toBe(
      'Tournament Administration'
    );
    expect(adminDescription.nativeElement.textContent.trim()).toContain(
      'organizing a tournament'
    );
  });

  it('should have admin panel button with correct router link', () => {
    const adminButton = fixture.debugElement.query(By.css('.btn-admin'));

    expect(adminButton.nativeElement.textContent.trim()).toContain(
      'Admin Panel'
    );
    expect(
      adminButton.nativeElement.getAttribute('ng-reflect-router-link')
    ).toBe('/admin');
  });

  it('should have proper accessibility attributes', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.btn[aria-label]'));
    expect(buttons.length).toBe(3);

    const ariaLabels = buttons.map((btn) =>
      btn.nativeElement.getAttribute('aria-label')
    );
    expect(ariaLabels).toContain('View tournament schedule');
    expect(ariaLabels).toContain('View tournament standings');
    expect(ariaLabels).toContain('Access admin panel');
  });

  it('should have SVG icons in buttons', () => {
    const buttonIcons = fixture.debugElement.queryAll(By.css('.btn-icon'));
    expect(buttonIcons.length).toBe(3);

    buttonIcons.forEach((icon) => {
      expect(icon.nativeElement.tagName.toLowerCase()).toBe('svg');
    });
  });

  it('should have SVG icons in feature cards', () => {
    const featureIcons = fixture.debugElement.queryAll(
      By.css('.feature-icon svg')
    );
    expect(featureIcons.length).toBe(4);
  });

  it('should have responsive design classes', () => {
    const heroSection = fixture.debugElement.query(By.css('.hero-section'));
    const featuresGrid = fixture.debugElement.query(By.css('.features-grid'));

    expect(heroSection).toBeTruthy();
    expect(featuresGrid).toBeTruthy();
  });
});
