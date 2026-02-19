// Efecto de escritura en el título (opcional)
const title = document.querySelector('h1');
const text = title.innerText;
title.innerText = '';

let i = 0;
function typeWriter() {
  if (i < text.length) {
    title.innerHTML += text.charAt(i);
    i++;
    setTimeout(typeWriter, 80);
  } else {
    title.innerHTML += '<span class="blink">_</span>';
  }
}
setTimeout(typeWriter, 600);

// Scroll suave para los links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});
