# InsaneGame

Página web de ofertas de videojuegos de PC hecha con HTML, CSS y JavaScript puro. Muestra descuentos reales de Steam consultando la API pública de [CheapShark](https://apidocs.cheapshark.com/). No usa frameworks, build ni API key.

## Cómo abrirla

### Opción 1: abrir el archivo directamente

Haz doble clic en `index.html` o ábrelo con tu navegador. La página funciona con el protocolo `file://` y necesita conexión a internet para cargar las ofertas y las fuentes de Google.

### Opción 2: servidor local (recomendado)

Desde la carpeta del proyecto:

```bash
npx serve .
```

También puedes usar Python:

```bash
python -m http.server 8000
```

Después abre la dirección que indique la terminal (por ejemplo, `http://localhost:3000` o `http://localhost:8000`).

## Pantallas

La navegación usa únicamente el hash de la URL:

- `#inicio`: portada, descripción y las 4 mejores ofertas del momento.
- `#ofertas`: buscador, orden, filtro de precio máximo y paginación con “Cargar más”.
- `#registro`: formulario de creación de cuenta con validación en tiempo real.

## API utilizada

- **Endpoint:** `GET https://www.cheapshark.com/api/1.0/deals`
- **Tienda:** `storeID=1` (Steam)
- **Parámetros usados:** `pageSize`, `pageNumber`, `sortBy`, `title`, `upperPrice`, `onSale=1`
- **Órdenes disponibles:** `Deal Rating`, `Savings`, `Price`, `Metacritic`, `Reviews`, `Title`
- **Campos consumidos:** `title`, `salePrice`, `normalPrice`, `savings`, `metacriticScore`, `steamRatingPercent`, `steamAppID`, `thumb`, `dealID`
- **Portada:** `https://cdn.cloudflare.steamstatic.com/steam/apps/{steamAppID}/header.jpg`, con `thumb` como alternativa si la imagen falla.
- **Enlace de compra:** `https://www.cheapshark.com/redirect?dealID={dealID}`

La API es gratuita, no requiere clave y permite peticiones desde el navegador (CORS). Los precios se muestran en USD. La página necesita conexión a internet para consultar CheapShark.

## Estructura

```text
index.html          Estructura de las tres pantallas y contenido estático
css/styles.css      Diseño arcade, variables CSS, modo oscuro y responsive
js/api.js           Llamadas fetch con async/await, timeout y errores propios
js/app.js           Navegación por hash, tarjetas, filtros, estados y paginación
js/validacion.js    Validación del registro y medidor de contraseña
README.md           Este archivo
```

## Comportamiento y detalles

- La búsqueda espera **400 ms** después de la última tecla antes de consultar la API.
- La paginación empieza en la página `0` y carga 12 ofertas por página.
- Los textos que vienen de la API se insertan con `textContent`, nunca con `innerHTML`.
- Los enlaces externos se abren en una pestaña nueva con `rel="noopener noreferrer"`.
- Se muestran estados de carga, sin resultados y error de conexión, con opción de reintentar.
- El registro no envía ni almacena datos: es una demostración local.
- El formulario valida al escribir, al salir de cada campo y al enviar. Si hay errores, enfoca el primer campo inválido.
- El diseño es responsive hasta 360 px, respeta `prefers-color-scheme` y `prefers-reduced-motion`, e incluye foco visible y mensajes con `aria-live`.

## Cómo probar cada pantalla

1. **Inicio:** abre `index.html#inicio`. Deben aparecer las 4 mejores ofertas con portada, precios, descuentos, calificaciones y enlace a CheapShark.
2. **Ofertas:** abre `#ofertas`. Escribe un título como `batman`, cambia el orden y el precio máximo, y pulsa “Cargar más”. Prueba una búsqueda sin resultados para ver el mensaje vacío y el botón “Limpiar filtros”.
3. **Registro:** abre `#registro`. Envía el formulario vacío para ver los errores y el foco en el primer campo. Prueba contraseñas débiles, una confirmación distinta y el medidor. Al completar todo correctamente, el formulario se oculta y aparece la bienvenida con el nombre de jugador.
4. **Responsive:** reduce la ventana hasta 360 px y comprueba la navegación, las tarjetas y el formulario.
5. **Modo oscuro:** activa el tema oscuro del sistema operativo o del navegador y recarga la página.
