document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navMenu = document.getElementById('nav-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  // Function to open/close the menu
  const toggleMenu = () => {
    navMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
  };

  // Click hamburger to toggle menu
  hamburgerBtn.addEventListener('click', toggleMenu);

  // Click anywhere on the dark overlay to close the menu
  menuOverlay.addEventListener('click', toggleMenu);
});
