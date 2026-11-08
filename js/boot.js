// If GSAP fails to load, the page stays fully readable: the "js" class is removed on window load
document.documentElement.classList.add('js');
window.addEventListener('load', function () {
  if (!window.gsap || !window.ScrollTrigger) document.documentElement.classList.remove('js');
});
