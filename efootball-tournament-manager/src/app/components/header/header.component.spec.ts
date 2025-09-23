import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the application title', () => {
    const titleElement = fixture.debugElement.query(By.css('.logo h1'));
    expect(titleElement.nativeElement.textContent).toBe(
      'eFootball Tournament Manager'
    );
  });

  it('should have navigation links for public pages', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('.nav-link'));
    const linkTexts = navLinks.map((link) =>
      link.nativeElement.textContent.trim()
    );

    expect(linkTexts).toContain('Home');
    expect(linkTexts).toContain('Schedule');
    expect(linkTexts).toContain('Standings');
    expect(linkTexts).toContain('Admin');
  });

  it('should have correct router links', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('.nav-link'));
    const routerLinks = navLinks.map((link) =>
      link.nativeElement.getAttribute('ng-reflect-router-link')
    );

    expect(routerLinks).toContain('/home');
    expect(routerLinks).toContain('/schedule');
    expect(routerLinks).toContain('/standings');
    expect(routerLinks).toContain('/admin');
  });

  it('should toggle mobile menu when button is clicked', () => {
    expect(component.isMobileMenuOpen).toBeFalse();

    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBeTrue();

    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBeFalse();
  });

  it('should close mobile menu when closeMobileMenu is called', () => {
    component.isMobileMenuOpen = true;

    component.closeMobileMenu();
    expect(component.isMobileMenuOpen).toBeFalse();
  });

  it('should have mobile menu button', () => {
    const mobileMenuBtn = fixture.debugElement.query(
      By.css('.mobile-menu-btn')
    );
    expect(mobileMenuBtn).toBeTruthy();
  });

  it('should have mobile navigation links', () => {
    const mobileNavLinks = fixture.debugElement.queryAll(
      By.css('.mobile-nav-link')
    );
    const linkTexts = mobileNavLinks.map((link) =>
      link.nativeElement.textContent.trim()
    );

    expect(linkTexts).toContain('Home');
    expect(linkTexts).toContain('Schedule');
    expect(linkTexts).toContain('Standings');
    expect(linkTexts).toContain('Admin');
  });

  it('should close mobile menu when mobile nav link is clicked', () => {
    component.isMobileMenuOpen = true;

    const mobileNavLink = fixture.debugElement.query(
      By.css('.mobile-nav-link')
    );
    mobileNavLink.nativeElement.click();

    expect(component.isMobileMenuOpen).toBeFalse();
  });

  it('should have admin link with special styling class', () => {
    const adminNavItem = fixture.debugElement.query(By.css('.admin-link'));
    expect(adminNavItem).toBeTruthy();

    const adminLink = adminNavItem.query(By.css('.nav-link'));
    expect(adminLink.nativeElement.textContent.trim()).toBe('Admin');
  });
});
