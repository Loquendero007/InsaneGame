/* =========================================================
   InsaneGame · Capa de acceso a CheapShark
   API pública, sin clave. Solo se consultan ofertas de Steam.
   ========================================================= */

(function () {
  "use strict";

  var ENDPOINT = "https://www.cheapshark.com/api/1.0/deals";
  var TIEMPO_LIMITE_MS = 12000;

  // Valores aceptados por el parámetro sortBy de CheapShark.
  var ORDENES = Object.freeze([
    "Deal Rating",
    "Savings",
    "Price",
    "Metacritic",
    "Reviews",
    "Title"
  ]);

  /**
   * Error propio para poder mostrar mensajes claros en la interfaz.
   * @param {string} mensaje
   * @param {string} tipo - conexion, servidor o tiempo.
   */
  function ErrorApi(mensaje, tipo) {
    this.name = "ErrorApi";
    this.message = mensaje;
    this.tipo = tipo;
    this.stack = new Error(mensaje).stack;
  }

  ErrorApi.prototype = Object.create(Error.prototype);
  ErrorApi.prototype.constructor = ErrorApi;

  /**
   * Construye la URL de consulta con los filtros recibidos.
   * @param {Object} opciones
   * @returns {string}
   */
  function construirUrl(opciones) {
    var parametros = new URLSearchParams();

    parametros.set("storeID", "1");
    parametros.set("pageSize", String(opciones.pageSize));
    parametros.set("pageNumber", String(opciones.pageNumber));
    parametros.set("sortBy", opciones.sortBy);

    if (opciones.title) {
      parametros.set("title", opciones.title);
    }

    if (opciones.upperPrice !== "" && opciones.upperPrice !== null && opciones.upperPrice !== undefined) {
      parametros.set("upperPrice", String(opciones.upperPrice));
    }

    if (opciones.onSale) {
      parametros.set("onSale", "1");
    }

    return ENDPOINT + "?" + parametros.toString();
  }

  /**
   * Obtiene ofertas de la API de CheapShark.
   * Usa fetch + async/await, un tiempo límite y try/catch.
   *
   * @param {Object} opciones
   * @param {number} [opciones.pageSize=12]
   * @param {number} [opciones.pageNumber=0]
   * @param {string} [opciones.sortBy="Deal Rating"]
   * @param {string} [opciones.title=""]
   * @param {string|number} [opciones.upperPrice=""]
   * @param {boolean} [opciones.onSale=true]
   * @returns {Promise<Array>}
   */
  async function obtenerOfertas(opciones) {
    var configuracion = opciones || {};

    var pageSize = Number.isFinite(Number(configuracion.pageSize))
      ? Math.max(1, Math.min(60, Number(configuracion.pageSize)))
      : 12;
    var pageNumber = Number.isFinite(Number(configuracion.pageNumber))
      ? Math.max(0, Math.floor(Number(configuracion.pageNumber)))
      : 0;
    var sortBy = ORDENES.indexOf(configuracion.sortBy) !== -1
      ? configuracion.sortBy
      : "Deal Rating";
    var title = typeof configuracion.title === "string" ? configuracion.title.trim() : "";
    var upperPrice = configuracion.upperPrice;
    var onSale = configuracion.onSale !== false;

    var url = construirUrl({
      pageSize: pageSize,
      pageNumber: pageNumber,
      sortBy: sortBy,
      title: title,
      upperPrice: upperPrice,
      onSale: onSale
    });

    var controlador = new AbortController();
    var temporizador = window.setTimeout(function () {
      controlador.abort();
    }, TIEMPO_LIMITE_MS);

    try {
      var respuesta = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controlador.signal,
        cache: "no-store"
      });

      if (!respuesta.ok) {
        throw new ErrorApi(
          "El servicio de ofertas no está disponible ahora mismo (HTTP " + respuesta.status + ").",
          "servidor"
        );
      }

      var datos;

      try {
        datos = await respuesta.json();
      } catch (errorLectura) {
        throw new ErrorApi(
          "La respuesta de CheapShark no se pudo interpretar. Inténtalo de nuevo.",
          "servidor"
        );
      }

      if (!Array.isArray(datos)) {
        throw new ErrorApi(
          "CheapShark devolvió una respuesta inesperada. Inténtalo de nuevo.",
          "servidor"
        );
      }

      return datos;
    } catch (error) {
      if (error instanceof ErrorApi) {
        throw error;
      }

      if (error && error.name === "AbortError") {
        throw new ErrorApi(
          "La consulta tardó demasiado. Revisa tu conexión e inténtalo otra vez.",
          "tiempo"
        );
      }

      throw new ErrorApi(
        "No pudimos conectar con CheapShark. Revisa tu conexión e inténtalo de nuevo.",
        "conexion"
      );
    } finally {
      window.clearTimeout(temporizador);
    }
  }

  // API pública del archivo, disponible para app.js.
  window.InsaneGameAPI = Object.freeze({
    obtenerOfertas: obtenerOfertas,
    ORDENES: ORDENES,
    ENDPOINT: ENDPOINT
  });
})();
