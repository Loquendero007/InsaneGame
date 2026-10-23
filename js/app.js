/* =========================================================
   InsaneGame · Navegación y vistas
   Se encarga de las pantallas, las tarjetas, los filtros,
   la paginación y los estados de carga de la API.
   ========================================================= */

(function () {
  "use strict";

  const API = window.InsaneGameAPI;

  const RUTAS = ["inicio", "ofertas", "registro"];
  const TITULOS_PAGINA = {
    inicio: "Ofertas de videojuegos de Steam",
    ofertas: "Ofertas de Steam",
    registro: "Crear cuenta"
  };

  const TAMANO_INICIO = 4;
  const TAMANO_OFERTAS = 12;
  const RETRASO_BUSQUEDA_MS = 400;

  const formatoUSD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const estado = {
    inicio: {
      cargando: false,
      cargada: false,
      solicitud: 0
    },
    ofertas: {
      iniciada: false,
      cargando: false,
      solicitud: 0,
      paginaCargada: -1,
      hayMas: false,
      mostradas: 0,
      filtros: null
    }
  };

  const elementos = {};
  let temporizadorBusqueda = null;

  /* ---------- Arranque ---------- */

  function iniciar() {
    guardarElementos();
    configurarNavegacion();
    configurarFiltros();
    configurarPaginacion();

    if (window.InsaneGameValidacion && typeof window.InsaneGameValidacion.iniciar === "function") {
      window.InsaneGameValidacion.iniciar();
    }

    const rutaInicial = obtenerRutaActual();

    // Si el hash no es válido, se reemplaza por #inicio sin recargar.
    reemplazarHash(rutaInicial, false);
    mostrarPantalla(rutaInicial, false);
    asegurarDatosDePantalla(rutaInicial);
  }

  function guardarElementos() {
    elementos.pantallas = Array.from(document.querySelectorAll(".pantalla"));
    elementos.enlacesNav = Array.from(document.querySelectorAll("[data-ruta]"));
    elementos.enlaceSaltar = document.querySelector(".saltar-contenido");
    elementos.gridInicio = document.getElementById("grid-inicio");
    elementos.estadoInicio = document.getElementById("estado-inicio");
    elementos.gridOfertas = document.getElementById("grid-ofertas");
    elementos.estadoOfertas = document.getElementById("estado-ofertas");
    elementos.formFiltros = document.getElementById("filtros-ofertas");
    elementos.busqueda = document.getElementById("busqueda");
    elementos.orden = document.getElementById("orden");
    elementos.precioMaximo = document.getElementById("precio-maximo");
    elementos.btnCargarMas = document.getElementById("btn-cargar-mas");
  }

  /* ---------- Navegación por hash ---------- */

  function obtenerRutaActual() {
    const ruta = window.location.hash.replace(/^#/, "").split(/[/?]/)[0];
    return RUTAS.indexOf(ruta) !== -1 ? ruta : "inicio";
  }

  function reemplazarHash(ruta, silencioso) {
    const destino = "#" + ruta;

    if (window.location.hash === destino) {
      return;
    }

    try {
      window.history.replaceState(null, "", destino);
    } catch (error) {
      // Algunos navegadores restringen replaceState en archivos locales.
      // La navegación por hash sigue funcionando aunque la URL no se actualice.
      if (!silencioso) {
        console.warn("No se pudo actualizar el hash de la URL:", error);
      }
    }
  }

  function mostrarPantalla(ruta, enfocar) {
    elementos.pantallas.forEach(function (pantalla) {
      pantalla.hidden = pantalla.dataset.pantalla !== ruta;
    });

    elementos.enlacesNav.forEach(function (enlace) {
      if (enlace.dataset.ruta === ruta) {
        enlace.setAttribute("aria-current", "page");
      } else {
        enlace.removeAttribute("aria-current");
      }
    });

    document.title = "InsaneGame | " + TITULOS_PAGINA[ruta];

    if (enfocar) {
      const pantallaActiva = document.getElementById("pantalla-" + ruta);
      const titulo = pantallaActiva ? pantallaActiva.querySelector("h1") : null;

      if (titulo) {
        titulo.focus({ preventScroll: true });
      }

      window.scrollTo(0, 0);
    }
  }

  function manejarCambioDeRuta() {
    const ruta = obtenerRutaActual();

    reemplazarHash(ruta, false);
    mostrarPantalla(ruta, true);
    asegurarDatosDePantalla(ruta);
  }

  function configurarNavegacion() {
    window.addEventListener("hashchange", manejarCambioDeRuta);

    // El enlace de salto no debe activar el enrutador por hash.
    if (elementos.enlaceSaltar) {
      elementos.enlaceSaltar.addEventListener("click", function (event) {
        const contenido = document.getElementById("contenido");

        if (contenido) {
          event.preventDefault();
          contenido.focus();
        }
      });
    }
  }

  function asegurarDatosDePantalla(ruta) {
    if (ruta === "inicio" && !estado.inicio.cargada && !estado.inicio.cargando) {
      cargarInicio();
    }

    if (ruta === "ofertas" && !estado.ofertas.iniciada && !estado.ofertas.cargando) {
      cargarOfertas({ reiniciar: true });
    }
  }

  /* ---------- Utilidades de interfaz ---------- */

  function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) {
      elemento.className = clase;
    }

    if (texto !== undefined && texto !== null) {
      elemento.textContent = texto;
    }

    return elemento;
  }

  function actualizarEstado(contenedor, tipo, mensaje, accion) {
    if (!contenedor) {
      return;
    }

    contenedor.replaceChildren();
    contenedor.removeAttribute("data-tipo");

    if (tipo === "error" || tipo === "vacio") {
      contenedor.dataset.tipo = tipo;
    }

    if (tipo === "cargando") {
      const cargador = crearElemento("span", "cargador");
      cargador.setAttribute("aria-hidden", "true");
      contenedor.appendChild(cargador);
    }

    const texto = crearElemento("span", null, mensaje);
    contenedor.appendChild(texto);

    if (accion) {
      const boton = crearElemento("button", "estado__accion", accion.texto);
      boton.type = "button";
      boton.addEventListener("click", accion.alHacerClick);
      contenedor.appendChild(boton);
    }
  }

  function crearEsqueletos(cantidad) {
    const fragmento = document.createDocumentFragment();

    for (let i = 0; i < cantidad; i += 1) {
      const tarjeta = crearElemento("div", "tarjeta-esqueleto");
      tarjeta.setAttribute("aria-hidden", "true");

      const media = crearElemento("div", "esqueleto-media");
      const cuerpo = crearElemento("div", "esqueleto-cuerpo");

      cuerpo.appendChild(crearElemento("span", "esqueleto-linea esqueleto-linea--titulo"));
      cuerpo.appendChild(crearElemento("span", "esqueleto-linea"));
      cuerpo.appendChild(crearElemento("span", "esqueleto-linea esqueleto-linea--corta"));
      cuerpo.appendChild(crearElemento("span", "esqueleto-linea esqueleto-linea--precio"));

      tarjeta.appendChild(media);
      tarjeta.appendChild(cuerpo);
      fragmento.appendChild(tarjeta);
    }

    return fragmento;
  }

  function textoCantidad(cantidad) {
    return cantidad === 1 ? "1 oferta" : cantidad + " ofertas";
  }

  function formatearPrecio(valor) {
    const numero = Number.parseFloat(valor);
    return Number.isFinite(numero) ? formatoUSD.format(numero) : "—";
  }

  function convertirNumero(valor) {
    const numero = Number.parseFloat(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  function calcularDescuento(oferta, precioVenta, precioNormal) {
    const descuentoApi = Number.parseFloat(oferta.savings);

    if (Number.isFinite(descuentoApi)) {
      return Math.max(0, Math.min(100, Math.round(descuentoApi)));
    }

    if (precioNormal > 0 && precioNormal > precioVenta) {
      return Math.round((1 - precioVenta / precioNormal) * 100);
    }

    return 0;
  }

  function obtenerFuentesDePortada(oferta) {
    const fuentes = [];
    const appId = String(oferta.steamAppID || "");

    if (/^\d+$/.test(appId)) {
      fuentes.push(
        "https://cdn.cloudflare.steamstatic.com/steam/apps/" + appId + "/header.jpg"
      );
    }

    if (typeof oferta.thumb === "string" && /^https:\/\//i.test(oferta.thumb)) {
      fuentes.push(oferta.thumb);
    }

    // Evita solicitar dos veces la misma imagen.
    return fuentes.filter(function (url, indice) {
      return fuentes.indexOf(url) === indice;
    });
  }

  function agregarPortadaVacia(media) {
    media.classList.add("tarjeta-oferta__media--vacia");

    if (!media.querySelector(".portada-vacia")) {
      media.appendChild(crearElemento("span", "portada-vacia", "Portada no disponible"));
    }
  }

  function obtenerUrlOferta(dealID) {
    if (!dealID) {
      return "https://www.cheapshark.com/";
    }

    let identificador = String(dealID);

    // El dealID llega codificado; se normaliza para evitar una doble codificación.
    try {
      identificador = encodeURIComponent(decodeURIComponent(identificador));
    } catch (error) {
      identificador = encodeURIComponent(identificador);
    }

    return "https://www.cheapshark.com/redirect?dealID=" + identificador;
  }

  function crearPuntuaciones(oferta) {
    const metacritic = convertirNumero(oferta.metacriticScore);
    const steam = convertirNumero(oferta.steamRatingPercent);

    if ((!metacritic || metacritic <= 0) && (!steam || steam <= 0)) {
      return null;
    }

    const contenedor = crearElemento("div", "puntuaciones");

    if (metacritic && metacritic > 0) {
      const puntuacion = crearElemento("span", "puntuacion puntuacion--metacritic");
      puntuacion.appendChild(crearElemento("span", null, "Metacritic"));
      puntuacion.appendChild(crearElemento("strong", null, String(Math.round(metacritic))));
      contenedor.appendChild(puntuacion);
    }

    if (steam && steam > 0) {
      const puntuacion = crearElemento("span", "puntuacion puntuacion--steam");
      puntuacion.appendChild(crearElemento("span", null, "Steam"));
      puntuacion.appendChild(crearElemento("strong", null, Math.round(steam) + "%"));
      contenedor.appendChild(puntuacion);
    }

    return contenedor;
  }

  /**
   * Crea una tarjeta usando exclusivamente textContent para los datos
   * que llegan de la API (nunca innerHTML).
   */
  function crearTarjetaOferta(oferta) {
    if (!oferta || typeof oferta !== "object") {
      return null;
    }

    const precioVenta = convertirNumero(oferta.salePrice);

    if (precioVenta === null) {
      return null;
    }

    const precioNormal = convertirNumero(oferta.normalPrice);
    const titulo = typeof oferta.title === "string" && oferta.title.trim()
      ? oferta.title.trim()
      : "Oferta de Steam";
    const descuento = calcularDescuento(oferta, precioVenta, precioNormal || 0);

    const tarjeta = crearElemento("article", "tarjeta-oferta");
    const media = crearElemento("div", "tarjeta-oferta__media");
    const fuentes = obtenerFuentesDePortada(oferta);

    if (fuentes.length > 0) {
      const imagen = document.createElement("img");
      let indiceFuente = 0;

      imagen.alt = "Portada de " + titulo;
      imagen.loading = "lazy";
      imagen.decoding = "async";

      imagen.addEventListener("error", function () {
        indiceFuente += 1;

        if (indiceFuente < fuentes.length) {
          imagen.src = fuentes[indiceFuente];
        } else {
          imagen.remove();
          agregarPortadaVacia(media);
        }
      });

      imagen.src = fuentes[0];
      media.appendChild(imagen);
    } else {
      agregarPortadaVacia(media);
    }

    if (descuento > 0) {
      media.appendChild(crearElemento("span", "etiqueta-descuento", "-" + descuento + "%"));
    }

    media.appendChild(crearElemento("span", "etiqueta-steam", "STEAM"));

    const cuerpo = crearElemento("div", "tarjeta-oferta__cuerpo");
    const tituloTarjeta = crearElemento("h3", "tarjeta-oferta__titulo", titulo);
    const puntuaciones = crearPuntuaciones(oferta);

    const pie = crearElemento("div", "tarjeta-oferta__pie");
    const precios = crearElemento("div", "precios");

    precios.appendChild(crearElemento("span", "precio-actual", formatearPrecio(precioVenta)));

    if (precioNormal !== null && precioNormal > precioVenta) {
      precios.appendChild(crearElemento("span", "precio-original", formatearPrecio(precioNormal)));
    }

    const enlace = crearElemento("a", "enlace-oferta", "Ir a la oferta");
    enlace.href = obtenerUrlOferta(oferta.dealID);
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.setAttribute(
      "aria-label",
      "Ir a la oferta de " + titulo + " en CheapShark (se abre en una pestaña nueva)"
    );

    pie.appendChild(precios);
    pie.appendChild(enlace);

    cuerpo.appendChild(tituloTarjeta);

    if (puntuaciones) {
      cuerpo.appendChild(puntuaciones);
    }

    cuerpo.appendChild(pie);
    tarjeta.appendChild(media);
    tarjeta.appendChild(cuerpo);

    return tarjeta;
  }

  /* ---------- Inicio: cuatro mejores ofertas ---------- */

  async function cargarInicio() {
    if (estado.inicio.cargando) {
      return;
    }

    if (!API) {
      actualizarEstado(
        elementos.estadoInicio,
        "error",
        "No se pudo cargar el módulo de ofertas. Recarga la página."
      );
      return;
    }

    const solicitud = ++estado.inicio.solicitud;
    estado.inicio.cargando = true;
    estado.inicio.cargada = false;

    elementos.gridInicio.setAttribute("aria-busy", "true");
    elementos.gridInicio.replaceChildren(crearEsqueletos(TAMANO_INICIO));
    actualizarEstado(
      elementos.estadoInicio,
      "cargando",
      "Buscando las 4 mejores ofertas de Steam…"
    );

    try {
      const ofertas = await API.obtenerOfertas({
        pageSize: TAMANO_INICIO,
        pageNumber: 0,
        sortBy: "Deal Rating",
        onSale: true
      });

      if (solicitud !== estado.inicio.solicitud) {
        return;
      }

      const tarjetas = ofertas
        .slice(0, TAMANO_INICIO)
        .map(crearTarjetaOferta)
        .filter(Boolean);

      if (tarjetas.length === 0) {
        elementos.gridInicio.replaceChildren();
        actualizarEstado(
          elementos.estadoInicio,
          "vacio",
          "Ahora mismo no hay ofertas disponibles. Vuelve a intentarlo en un momento.",
          { texto: "Recargar", alHacerClick: cargarInicio }
        );
      } else {
        const fragmento = document.createDocumentFragment();
        tarjetas.forEach(function (tarjeta) {
          fragmento.appendChild(tarjeta);
        });

        elementos.gridInicio.replaceChildren(fragmento);
        actualizarEstado(
          elementos.estadoInicio,
          "info",
          "Cargadas " + textoCantidad(tarjetas.length) + " con la mejor valoración de oferta."
        );
      }

      estado.inicio.cargada = true;
    } catch (error) {
      if (solicitud !== estado.inicio.solicitud) {
        return;
      }

      console.error("Error al cargar las ofertas de inicio:", error);
      elementos.gridInicio.replaceChildren();
      actualizarEstado(
        elementos.estadoInicio,
        "error",
        error && error.message
          ? error.message
          : "No pudimos cargar las ofertas. Revisa tu conexión e inténtalo de nuevo.",
        { texto: "Reintentar", alHacerClick: cargarInicio }
      );
    } finally {
      if (solicitud === estado.inicio.solicitud) {
        estado.inicio.cargando = false;
        elementos.gridInicio.setAttribute("aria-busy", "false");
      }
    }
  }

  /* ---------- Ofertas: filtros y paginación ---------- */

  function leerFiltros() {
    return {
      title: elementos.busqueda.value.trim(),
      sortBy: elementos.orden.value,
      upperPrice: elementos.precioMaximo.value
    };
  }

  async function cargarOfertas(opciones) {
    const reiniciar = Boolean(opciones && opciones.reiniciar);

    // Las nuevas búsquedas pueden reemplazar una petición en curso.
    if (estado.ofertas.cargando && !reiniciar) {
      return;
    }

    if (!API) {
      actualizarEstado(
        elementos.estadoOfertas,
        "error",
        "No se pudo cargar el módulo de ofertas. Recarga la página."
      );
      return;
    }

    if (!reiniciar && !estado.ofertas.hayMas) {
      return;
    }

    const solicitud = ++estado.ofertas.solicitud;
    const filtros = reiniciar
      ? leerFiltros()
      : (estado.ofertas.filtros || leerFiltros());
    const paginaSolicitada = reiniciar ? 0 : estado.ofertas.paginaCargada + 1;

    estado.ofertas.iniciada = true;
    estado.ofertas.cargando = true;
    elementos.gridOfertas.setAttribute("aria-busy", "true");

    if (reiniciar) {
      estado.ofertas.filtros = filtros;
      estado.ofertas.paginaCargada = -1;
      estado.ofertas.hayMas = false;
      estado.ofertas.mostradas = 0;
      elementos.gridOfertas.replaceChildren(crearEsqueletos(8));
      elementos.btnCargarMas.hidden = true;
      actualizarEstado(elementos.estadoOfertas, "cargando", "Buscando ofertas de Steam…");
    } else {
      elementos.btnCargarMas.disabled = true;
      elementos.btnCargarMas.textContent = "Cargando…";
      actualizarEstado(elementos.estadoOfertas, "cargando", "Cargando más ofertas…");
    }

    try {
      const ofertas = await API.obtenerOfertas({
        pageSize: TAMANO_OFERTAS,
        pageNumber: paginaSolicitada,
        sortBy: filtros.sortBy,
        title: filtros.title,
        upperPrice: filtros.upperPrice,
        onSale: true
      });

      if (solicitud !== estado.ofertas.solicitud) {
        return;
      }

      const tarjetas = ofertas.map(crearTarjetaOferta).filter(Boolean);
      const fragmento = document.createDocumentFragment();

      tarjetas.forEach(function (tarjeta) {
        fragmento.appendChild(tarjeta);
      });

      if (reiniciar) {
        elementos.gridOfertas.replaceChildren(fragmento);
      } else {
        elementos.gridOfertas.appendChild(fragmento);
      }

      estado.ofertas.paginaCargada = paginaSolicitada;
      estado.ofertas.mostradas += tarjetas.length;
      estado.ofertas.hayMas = ofertas.length === TAMANO_OFERTAS;

      if (estado.ofertas.mostradas === 0) {
        estado.ofertas.hayMas = false;
        actualizarEstado(
          elementos.estadoOfertas,
          "vacio",
          "No encontramos ofertas de Steam con esos filtros. Prueba con otro título o sube el precio máximo.",
          { texto: "Limpiar filtros", alHacerClick: limpiarFiltros }
        );
      } else if (tarjetas.length === 0 && !reiniciar) {
        actualizarEstado(
          elementos.estadoOfertas,
          "info",
          "No hay más ofertas para mostrar con estos filtros."
        );
      } else {
        actualizarEstado(
          elementos.estadoOfertas,
          "info",
          "Mostrando " + textoCantidad(estado.ofertas.mostradas) + "."
        );
      }
    } catch (error) {
      if (solicitud !== estado.ofertas.solicitud) {
        return;
      }

      console.error("Error al cargar ofertas:", error);

      if (reiniciar) {
        elementos.gridOfertas.replaceChildren();
      }

      actualizarEstado(
        elementos.estadoOfertas,
        "error",
        error && error.message
          ? error.message
          : "No pudimos cargar las ofertas. Revisa tu conexión e inténtalo de nuevo.",
        {
          texto: "Reintentar",
          alHacerClick: function () {
            cargarOfertas({ reiniciar: reiniciar });
          }
        }
      );
    } finally {
      if (solicitud === estado.ofertas.solicitud) {
        estado.ofertas.cargando = false;
        elementos.gridOfertas.setAttribute("aria-busy", "false");
        elementos.btnCargarMas.disabled = false;
        elementos.btnCargarMas.textContent = "Cargar más ofertas";
        elementos.btnCargarMas.hidden = !estado.ofertas.hayMas || estado.ofertas.mostradas === 0;
      }
    }
  }

  function limpiarFiltros() {
    elementos.busqueda.value = "";
    elementos.orden.value = "Deal Rating";
    elementos.precioMaximo.value = "";
    cargarOfertas({ reiniciar: true });
  }

  function configurarFiltros() {
    // Retraso de 400 ms para no consultar la API en cada tecla.
    elementos.busqueda.addEventListener("input", function () {
      window.clearTimeout(temporizadorBusqueda);
      temporizadorBusqueda = window.setTimeout(function () {
        cargarOfertas({ reiniciar: true });
      }, RETRASO_BUSQUEDA_MS);
    });

    elementos.formFiltros.addEventListener("submit", function (event) {
      event.preventDefault();
      window.clearTimeout(temporizadorBusqueda);
      cargarOfertas({ reiniciar: true });
    });

    [elementos.orden, elementos.precioMaximo].forEach(function (selector) {
      selector.addEventListener("change", function () {
        window.clearTimeout(temporizadorBusqueda);
        cargarOfertas({ reiniciar: true });
      });
    });
  }

  function configurarPaginacion() {
    elementos.btnCargarMas.addEventListener("click", function () {
      cargarOfertas({ reiniciar: false });
    });
  }

  /* ---------- Inicio de la aplicación ---------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
