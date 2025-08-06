class PortfolioNavigation {
  constructor() {
    this.init();
  }

  init() {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', () => this.setupNavigation());
    else
      this.setupNavigation();
  }

  setupNavigation() {
    const navToggles = document.querySelectorAll('.section-toggle');
    const tabSections = document.querySelectorAll('.tab-section');

    navToggles.forEach(toggle => toggle.addEventListener('click', (e) => this.handleNavClick(e, tabSections, navToggles)));

    if (navToggles.length > 0) {
      this.showSection('summary', tabSections);
      this.setActiveNav(navToggles[0], navToggles);
    }
  }

  handleNavClick(event, tabSections, navToggles) {
    event.preventDefault();
    
    const targetTab = event.currentTarget.dataset.tab;
    
    this.setActiveNav(event.currentTarget, navToggles);
    this.showSection(targetTab, tabSections);
  }

  setActiveNav(activeToggle, allToggles) {
    allToggles.forEach(toggle => toggle.classList.remove('active'));
    activeToggle.classList.add('active');
  }

  showSection(targetTab, tabSections) {
    tabSections.forEach(section => section.classList.remove('active'));

    const targetSection = document.getElementById(targetTab);
    if (targetSection)
      targetSection.classList.add('active');
  }
}

const portfolioNav = new PortfolioNavigation();
