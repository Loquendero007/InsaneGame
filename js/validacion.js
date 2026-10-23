/* =========================================================
   InsaneGame · Validación del formulario de registro
   Valida al escribir, al salir de cada campo y al enviar.
   Muestra errores debajo de cada campo y un medidor de seguridad.
   ========================================================= */

(function () {
  "use strict";

  let inicializado = false;

  /**
   * Inicia la validación del formulario.
   * Se llama desde app.js cuando el DOM ya está disponible.
   */
  function iniciar() {
    if (inicializado) {
      return;
    }

    const formulario = document.getElementById("form-registro");
    const exito = document.getElementById("registro-exito");
    const nombreBienvenida = document.getElementById("nombre-bienvenida");

    if (!formulario || !exito || !nombreBienvenida) {
      return;
    }

    inicializado = true;

    const medidor = document.getElementById("medidor-contrasena");
    const textoFuerza = document.getElementById("texto-fuerza");

    // Definición de campos en el mismo orden en que aparecen en el HTML.
    const campos = [
      { nombre: "nombre", id: "nombre", validar: validarNombre },
      { nombre: "correo", id: "correo", validar: validarCorreo },
      { nombre: "jugador", id: "jugador", validar: validarJugador },
      { nombre: "plataforma", id: "plataforma", validar: validarPlataforma },
      { nombre: "contrasena", id: "contrasena", validar: validarContrasena },
      { nombre: "confirmar", id: "confirmar", validar: validarConfirmacion },
      { nombre: "terminos", id: "terminos", validar: validarTerminos }
    ].map(function (definicion) {
      const control = document.getElementById(definicion.id);
      const contenedor = control ? control.closest(".campo") : null;
      const error = contenedor ? contenedor.querySelector(".campo__error") : null;

      return {
        nombre: definicion.nombre,
        control: control,
        contenedor: contenedor,
        error: error,
        validar: definicion.validar
      };
    });

    if (campos.some(function (campo) { return !campo.control || !campo.contenedor || !campo.error; })) {
      return;
    }

    const camposPorNombre = {};
    const tocados = new Set();

    campos.forEach(function (campo) {
      camposPorNombre[campo.nombre] = campo;
    });

    /* ---------- Funciones de validación ---------- */

    function resultado(valido, mensaje) {
      return { valido: valido, mensaje: valido ? "" : mensaje };
    }

    function validarNombre(control) {
      const valor = control.value.trim();

      if (!valor) {
        return resultado(false, "Escribe tu nombre completo.");
      }

      // Solo letras Unicode y espacios, con al menos nombre y apellido.
      if (!/^[\p{L}]+(?:\s+[\p{L}]+)+$/u.test(valor)) {
        return resultado(false, "Usa solo letras y escribe al menos nombre y apellido.");
      }

      return resultado(true);
    }

    function validarCorreo(control) {
      const valor = control.value.trim();

      if (!valor) {
        return resultado(false, "Escribe tu correo electrónico.");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
        return resultado(false, "El correo no tiene un formato válido.");
      }

      return resultado(true);
    }

    function validarJugador(control) {
      const valor = control.value.trim();

      if (!valor) {
        return resultado(false, "Elige un nombre de jugador.");
      }

      if (!/^[A-Za-z0-9_]{4,16}$/.test(valor)) {
        return resultado(false, "Debe tener entre 4 y 16 caracteres: letras, números o guion bajo.");
      }

      return resultado(true);
    }

    function validarPlataforma(control) {
      const permitidas = ["PC", "PlayStation", "Xbox", "Nintendo"];

      if (!control.value) {
        return resultado(false, "Selecciona tu plataforma favorita.");
      }

      if (permitidas.indexOf(control.value) === -1) {
        return resultado(false, "Elige una plataforma de la lista.");
      }

      return resultado(true);
    }

    function validarContrasena(control) {
      const valor = control.value;

      if (!valor) {
        return resultado(false, "Crea una contraseña.");
      }

      if (valor.length < 8) {
        return resultado(false, "Usa al menos 8 caracteres.");
      }

      if (!/\p{Lu}/u.test(valor)) {
        return resultado(false, "Agrega al menos una letra mayúscula.");
      }

      if (!/\d/.test(valor)) {
        return resultado(false, "Agrega al menos un número.");
      }

      return resultado(true);
    }

    function validarConfirmacion(control) {
      const valor = control.value;
      const contrasena = camposPorNombre.contrasena.control.value;

      if (!valor) {
        return resultado(false, "Confirma tu contraseña.");
      }

      if (valor !== contrasena) {
        return resultado(false, "Las contraseñas no coinciden.");
      }

      return resultado(true);
    }

    function validarTerminos(control) {
      if (!control.checked) {
        return resultado(false, "Debes aceptar los términos para crear tu cuenta.");
      }

      return resultado(true);
    }

    /* ---------- Presentación de resultados ---------- */

    function validarCampo(campo, mostrarResultado) {
      const estadoCampo = campo.validar(campo.control);
      const mostrar = mostrarResultado !== false;

      if (mostrar) {
        campo.contenedor.classList.toggle("campo--error", !estadoCampo.valido);
        campo.contenedor.classList.toggle("campo--valido", estadoCampo.valido);
        campo.error.textContent = estadoCampo.mensaje;
        campo.control.setAttribute("aria-invalid", estadoCampo.valido ? "false" : "true");
      }

      return estadoCampo.valido;
    }

    function calcularFuerza(valor) {
      if (!valor) {
        return 0;
      }

      let puntos = 0;

      if (valor.length >= 8) {
        puntos += 1;
      }

      if (valor.length >= 12) {
        puntos += 1;
      }

      if (/\p{Ll}/u.test(valor) && /\p{Lu}/u.test(valor)) {
        puntos += 1;
      }

      if (/\d/.test(valor)) {
        puntos += 1;
      }

      if (/[^\p{L}\d]/u.test(valor)) {
        puntos += 1;
      }

      // Cualquier contraseña no vacía muestra al menos el nivel "débil".
      return Math.min(4, Math.max(1, puntos));
    }

    function actualizarMedidor() {
      const valor = camposPorNombre.contrasena.control.value;
      const fuerza = calcularFuerza(valor);
      const etiquetas = [
        "Seguridad: —",
        "Seguridad: débil",
        "Seguridad: media",
        "Seguridad: fuerte",
        "Seguridad: muy fuerte"
      ];

      medidor.dataset.fuerza = String(fuerza);
      medidor.setAttribute("aria-valuenow", String(fuerza));
      medidor.setAttribute("aria-valuetext", etiquetas[fuerza]);
      textoFuerza.textContent = etiquetas[fuerza];
    }

    /* ---------- Eventos de cada campo ---------- */

    campos.forEach(function (campo) {
      const esCheckbox = campo.nombre === "terminos";
      const esSelect = campo.nombre === "plataforma";

      function marcarTocado() {
        tocados.add(campo.nombre);
      }

      function alEditar() {
        marcarTocado();
        validarCampo(campo, true);

        // Si cambia la contraseña, actualiza el medidor y revisa la confirmación.
        if (campo.nombre === "contrasena") {
          actualizarMedidor();

          const confirmacion = camposPorNombre.confirmar;

          if (tocados.has("confirmar") || confirmacion.control.value) {
            validarCampo(confirmacion, true);
          }
        }
      }

      if (esCheckbox || esSelect) {
        campo.control.addEventListener("change", alEditar);
      } else {
        campo.control.addEventListener("input", alEditar);
      }

      campo.control.addEventListener("blur", function () {
        marcarTocado();
        validarCampo(campo, true);
      });
    });

    /* ---------- Envío del formulario ---------- */

    formulario.addEventListener("submit", function (event) {
      event.preventDefault();

      let primerCampoInvalido = null;

      campos.forEach(function (campo) {
        tocados.add(campo.nombre);
        const esValido = validarCampo(campo, true);

        if (!esValido && !primerCampoInvalido) {
          primerCampoInvalido = campo;
        }
      });

      if (primerCampoInvalido) {
        primerCampoInvalido.control.focus();
        return;
      }

      // Sin backend: se oculta el formulario y se muestra la bienvenida.
      nombreBienvenida.textContent = camposPorNombre.jugador.control.value.trim();
      formulario.hidden = true;
      exito.hidden = false;
      exito.focus();
    });

    // Estado inicial del medidor y de los campos.
    actualizarMedidor();

    campos.forEach(function (campo) {
      campo.control.setAttribute("aria-invalid", "false");
    });
  }

  window.InsaneGameValidacion = Object.freeze({
    iniciar: iniciar
  });
})();
