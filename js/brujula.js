/* =========================================================
   Bitácora Digital — brújula 3D del inicio
   La aguja del logo, hecha en 3D con Three.js:
     - se inclina hacia el mouse (en celular, hacia donde se toque)
     - gira al bajar con el scroll
     - oscila suave como una brújula de verdad que se acomoda
   Si el equipo no soporta 3D o la persona prefiere menos movimiento,
   se queda la imagen plana del logo.

   Índice:
     Comprobaciones
     Escena, cámara y luces
     La aguja (geometría con facetas, como el logo)
     Interacción (mouse, toque, scroll)
     Animación (solo cuando se ve en pantalla)
   ========================================================= */


/* Comprobaciones
   ------------------------------------------------------- */
const marco = document.querySelector(".js-brujula");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function soporta3D() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
}

// Equipos de gama baja (4 núcleos o menos, o 2 GB de memoria o menos):
// se queda la brújula plana con una animación suave hecha en CSS.
const gamaBaja = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
if (gamaBaja) document.documentElement.classList.add("gama-baja");
if (marco && gamaBaja) marco.classList.add("is-liviano");

if (marco && !sinMovimiento && !gamaBaja && soporta3D()) {
  // Se carga después de que la página terminó de cargar y el navegador está libre
  const empezar = () => import("./vendor/three.module.min.js").then(iniciar).catch(() => {});
  const cuandoLibre = () => {
    if ("requestIdleCallback" in window) requestIdleCallback(empezar, { timeout: 2500 });
    else setTimeout(empezar, 600);
  };
  if (document.readyState === "complete") cuandoLibre();
  else window.addEventListener("load", cuandoLibre, { once: true });
}


async function iniciar(THREE) {

  /* Escena, cámara y luces
     ------------------------------------------------------- */
  const lienzo = document.createElement("canvas");
  lienzo.className = "brujula__lienzo";
  lienzo.setAttribute("aria-hidden", "true");
  marco.appendChild(lienzo);

  const pantallaChica = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !pantallaChica, alpha: true, powerPreference: "low-power" });
  // Resolución: en pantallas táctiles (celular y tableta) un poco menor; no se nota y va más fluido
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tactil ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camara.position.set(0, 0, 5.6);

  escena.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3e, 1.9));

  const clave = new THREE.DirectionalLight(0xffffff, 3.2);   // luz principal arriba a la derecha
  clave.position.set(3, 4, 5);
  escena.add(clave);

  const contra = new THREE.DirectionalLight(0xffffff, 0.8);  // contraluz suave
  contra.position.set(-4, -2, -3);
  escena.add(contra);


  /* La aguja
     Dos mitades de 4 facetas cada una, como el logo:
     norte claro (blanco y gris perla), sur oscuro (grafito), igual que el logo.
     ------------------------------------------------------- */
  const largo = 1.55;   // de la punta al centro
  const ancho = 0.42;   // hacia los lados
  const alto = 0.22;    // grosor de la arista central

  const N = [0, largo, 0], S = [0, -largo, 0];
  const E = [ancho, 0, 0], O = [-ancho, 0, 0];
  const F = [0, 0, alto], A = [0, 0, -alto];     // frente y atrás

  function mitad(caras, colores) {
    const pos = [], col = [];
    caras.forEach((cara, i) => {
      const c = new THREE.Color(colores[i]);
      cara.forEach((v) => {
        pos.push(...v);
        col.push(c.r, c.g, c.b);
      });
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    metalness: 0.12,
    roughness: 0.45,
    side: THREE.DoubleSide
  });

  const norte = new THREE.Mesh(mitad(
    [[N, O, F], [N, F, E], [N, A, O], [N, E, A]],
    ["#d1d1d6", "#ffffff", "#9a9aa0", "#c4c4ca"]
  ), material);

  const sur = new THREE.Mesh(mitad(
    [[S, F, O], [S, E, F], [S, O, A], [S, A, E]],
    ["#636366", "#3a3a3c", "#2c2c2e", "#4a4a4d"]
  ), material);

  const aguja = new THREE.Group();
  aguja.add(norte, sur);

  // Inclinada 45°, como en el logo (punta norte arriba a la derecha)
  const soporte = new THREE.Group();
  soporte.rotation.z = -Math.PI / 4;
  soporte.add(aguja);
  escena.add(soporte);


  /* Interacción
     ------------------------------------------------------- */
  let objetivoX = 0, objetivoY = 0;     // inclinación deseada
  let giroScroll = 0;

  function apuntar(x, y) {
    const r = marco.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 2 - 1;
    const ny = ((y - r.top) / r.height) * 2 - 1;
    objetivoY = Math.max(-1.4, Math.min(1.4, nx)) * 0.55;
    objetivoX = Math.max(-1.4, Math.min(1.4, ny)) * 0.45;
  }

  window.addEventListener("pointermove", (e) => apuntar(e.clientX, e.clientY), { passive: true });
  marco.addEventListener("pointerleave", () => { objetivoX = objetivoY = 0; });

  window.addEventListener("scroll", () => {
    giroScroll = window.scrollY * 0.0025;
  }, { passive: true });


  /* Tamaño del lienzo
     ------------------------------------------------------- */
  // Posición base de la aguja: centrada y un poco arriba,
  // para dejar sitio al nombre debajo.
  let baseX = 0, baseY = 0;

  function ajustar() {
    const w = marco.clientWidth, h = marco.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();

    const altoVisible = 2 * camara.position.z * Math.tan((camara.fov * Math.PI) / 360);
    const anchoVisible = altoVisible * camara.aspect;
    const ancha = camara.aspect > 1;
    baseX = 0;
    baseY = altoVisible * (ancha ? 0.19 : 0.17);
    const escala = (ancha ? 0.52 : Math.min(0.72, anchoVisible / 3.4));
    soporte.scale.setScalar(escala);
  }
  new ResizeObserver(ajustar).observe(marco);
  ajustar();


  /* Animación (solo cuando se ve en pantalla)
     ------------------------------------------------------- */
  let enPantalla = true;
  let pestanaActiva = !document.hidden;
  let visible = true;
  let corriendo = false;
  let primera = true;
  const reloj = new THREE.Clock();

  function cuadro() {
    if (!visible) { corriendo = false; return; }
    const t = reloj.getElapsedTime();

    // Oscilación de brújula que se acomoda, más el giro del scroll
    const vaiven = Math.sin(t * 0.9) * 0.06 + Math.sin(t * 2.3) * 0.015;
    aguja.rotation.z += ((vaiven - giroScroll) - aguja.rotation.z) * 0.08;

    // Inclinación hacia el mouse, suave
    aguja.rotation.x += (objetivoX - aguja.rotation.x) * 0.06;
    aguja.rotation.y += (objetivoY - aguja.rotation.y) * 0.06;

    // Flota un poquito
    soporte.position.x = baseX;
    soporte.position.y = baseY + Math.sin(t * 1.1) * 0.05;

    renderer.render(escena, camara);

    if (primera) {
      primera = false;
      marco.classList.add("is-3d");   // oculta la imagen plana y muestra el 3D
    }
    requestAnimationFrame(cuadro);
  }

  function arrancar() {
    if (!corriendo) {
      corriendo = true;
      requestAnimationFrame(cuadro);
    }
  }

  function revisar() {
    visible = enPantalla && pestanaActiva;
    if (visible) arrancar();
  }

  new IntersectionObserver((e) => {
    enPantalla = e[0].isIntersecting;
    revisar();
  }).observe(marco);

  document.addEventListener("visibilitychange", () => {
    pestanaActiva = !document.hidden;
    revisar();
  });

  // Prepara los efectos de luz en segundo plano antes del primer cuadro,
  // así el navegador no se congela al mostrar el 3D
  try {
    if (renderer.compileAsync) await renderer.compileAsync(escena, camara);
  } catch (e) { /* si no se puede, se prepara al dibujar */ }

  arrancar();
}
