/**
 * blackhole.js
 * Generates twinkling stars for the blackhole page.
 */
(function () {
  const body = document.body;

  function createStar() {
    const star = document.createElement('div');
    star.classList.add('star');
    star.style.top = Math.random() * window.innerHeight + 'px';
    star.style.left = Math.random() * window.innerWidth + 'px';
    star.style.animationDuration = (Math.random() * 2 + 1) + 's';
    body.appendChild(star);
  }

  for (let i = 0; i < 100; i++) {
    createStar();
  }
})();