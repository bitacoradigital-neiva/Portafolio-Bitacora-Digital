/* =========================================================
   Bitácora Digital — comportamiento

   Índice:
     Ajustes
     Enlaces de WhatsApp con mensaje según el servicio
     Párrafo del estudio: separa las palabras
     Escenas de servicios: el video se reproduce al llegar
     Animaciones ligadas al scroll (un solo bucle)
     Aparición al bajar
   (La brújula 3D del inicio está en brujula.js)
   ========================================================= */

(function () {
  "use strict";

  // Avisa al CSS que el JavaScript sí cargó (activa las animaciones)
  document.documentElement.classList.add("js");


  /* Ajustes
     ------------------------------------------------------- */
  var WHATSAPP = "573144321446";
  var sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function limitar(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }


  /* WhatsApp
     ------------------------------------------------------- */
  document.querySelectorAll(".js-wa").forEach(function (a) {
    var servicio = a.dataset.servicio;
    var mensaje = servicio
      ? "Hola, Bitácora Digital. Vi su sitio web y me interesa " + servicio + "."
      : "Hola, Bitácora Digital. Vi su sitio web y quiero hablar de un proyecto.";
    a.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(mensaje);
  });


  /* Párrafo del estudio: separa cada palabra en un <span class="w">
     ------------------------------------------------------- */
  var parrafo = document.querySelector(".js-words");
  var palabras = [];

  if (parrafo) {
    var texto = parrafo.textContent.trim();
    parrafo.setAttribute("aria-label", texto);
    parrafo.textContent = "";
    texto.split(/\s+/).forEach(function (p) {
      var s = document.createElement("span");
      s.className = "w";
      s.setAttribute("aria-hidden", "true");
      s.textContent = p;
      parrafo.appendChild(s);
      parrafo.appendChild(document.createTextNode(" "));
      palabras.push(s);
    });
  }


  /* Escenas de servicios
     Cada video se carga cuando está cerca de la pantalla y se reproduce
     una vez, suave, cuando la mitad del video ya se ve. Al terminar queda
     en el último cuadro; si la persona vuelve a la sección, empieza de nuevo.
     En pantallas pequeñas se usa la versión liviana.
     ------------------------------------------------------- */
  var pantallaGrande = window.matchMedia("(min-width: 900px)").matches;

  document.querySelectorAll(".js-scene").forEach(function (escena) {
    var video = escena.querySelector("video");
    var base = escena.dataset.video;

    // Carga anticipada: una pantalla antes de llegar
    new IntersectionObserver(function (entradas, obs) {
      if (entradas[0].isIntersecting) {
        video.preload = "auto";
        video.src = base + (pantallaGrande ? ".mp4" : "-m.mp4");
        obs.disconnect();
      }
    }, { rootMargin: "100% 0px" }).observe(escena);

    // Reproducción: solo mientras se ve
    new IntersectionObserver(function (entradas) {
      if (entradas[0].isIntersecting) {
        if (sinMovimiento) return;
        if (video.ended) video.currentTime = 0;
        var p = video.play();
        if (p) p.catch(function () {});
      } else {
        video.pause();
        if (video.ended || video.currentTime > 0) video.currentTime = 0;
      }
    }, { threshold: 0.5 }).observe(video);
  });


  /* Animaciones ligadas al scroll
     ------------------------------------------------------- */
  var nav = document.querySelector(".js-nav");
  var heroTexto = document.querySelector(".js-hero-text");
  var claro = document.querySelector(".services");
  var pendiente = false;

  function alBajar() {
    pendiente = false;
    var alto = window.innerHeight;
    var y = window.scrollY;

    // Texto del inicio: sube y se desvanece
    if (heroTexto && !sinMovimiento) {
      var p = limitar(y / (alto * 0.6), 0, 1);
      heroTexto.style.opacity = String(1 - p);
      heroTexto.style.transform = "translate3d(0," + (-p * 60) + "px,0) scale(" + (1 - p * 0.06) + ")";
    }

    // Palabras que se encienden según avanza el párrafo
    if (palabras.length) {
      var rp = parrafo.getBoundingClientRect();
      var avance = limitar((alto * 0.85 - rp.top) / (rp.height + alto * 0.35), 0, 1);
      var encendidas = sinMovimiento ? palabras.length : Math.round(avance * palabras.length);
      for (var i = 0; i < palabras.length; i++) {
        palabras[i].classList.toggle("is-on", i < encendidas);
      }
    }

    // Barra de vidrio clara encima de la sección clara
    if (nav && claro) {
      var rc = claro.getBoundingClientRect();
      nav.classList.toggle("is-light", rc.top < 40 && rc.bottom > 40);
    }
  }

  window.addEventListener("scroll", function () {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(alBajar);
    }
  }, { passive: true });

  window.addEventListener("resize", alBajar);
  alBajar();


  /* Aparición al bajar
     Los elementos hermanos aparecen uno tras otro (escalonado).
     ------------------------------------------------------- */
  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        observador.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll(".reveal").forEach(function (el) {
    var hermanos = Array.prototype.filter.call(el.parentNode.children, function (h) {
      return h.classList.contains("reveal");
    });
    var i = hermanos.indexOf(el);
    if (i > 0) el.style.setProperty("--d", Math.min(i, 5) * 0.08 + "s");
    observador.observe(el);
  });
})();
