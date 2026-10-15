# Algoritmo de comparación (producto único)

## Reglas de elegibilidad

1. La variante debe existir en el catálogo.
2. La unidad pedida debe coincidir exactamente con la unidad base registrada. No hay conversión implícita.
3. Se consideran ofertas PEN de proveedor VERIFIED, disponibles/limitadas, y no vencidas.
4. Se excluye una oferta cuando el stock conocido no cubre los paquetes completos requeridos.
5. Para delivery solicitado, la oferta requiere delivery habilitado y tarifa conocida para tener costo total comparable. Si faltan datos, queda `PENDING_CONFIRMATION` y no puede ganar por menor costo.

## Cantidad y costos

`contenidoPaquete = cantidadBase × unidadesPorPaquete`

`paquetes = max(mínimoProveedor, ceil(cantidadSolicitada / contenidoPaquete))`

`cantidadComprada = paquetes × contenidoPaquete`

`excedente = cantidadComprada − cantidadSolicitada`

`costoProductosCentavos = precioPaqueteCentavos × paquetes`

`totalCentavos = costoProductosCentavos + tarifaEntregaConocidaCentavos`

La tarifa gratuita se aplica si el importe de productos alcanza el mínimo configurado. No se calcula combustible, recojo, ruta o tiempo. El servidor transforma precio decimal a céntimos enteros antes de multiplicar.

## Ranking

El “menor costo” usa el mínimo total conocido. “Más cercano” usa la distancia Haversine en línea recta solo si el usuario y sucursal tienen coordenadas. Nunca se etiqueta como ruta vial.

Para el equilibrio, cada criterio disponible se normaliza a 0–100 dentro del conjunto comparable:

- Precio: `100 × (máximo − valor) / (máximo − mínimo)`.
- Distancia: misma fórmula, con distancia como valor.
- Si todos empatan en una dimensión, reciben 100 en esa dimensión.
- Los pesos de precio/distancia se normalizan a suma 100. Una dimensión desconocida se excluye del denominador; no vale cero.
- Un resultado sin costo confirmado no entra al ranking de precio. Se explica por qué quedó pendiente.

El frontend actual permite variar precio/distancia (65/35 inicial). No hay preferencias guardadas ni ranking por rapidez/disponibilidad.

## Escenario de aceptación ficticio

Para un saco de 50 kg y delivery conocido:

| Proveedor | Productos | Entrega | Total |
|---|---:|---:|---:|
| A (DEMO) | S/ 185 | S/ 15 | S/ 200 |
| B (DEMO) | S/ 178 | S/ 10 | S/ 188 |
| C (DEMO) | S/ 180 | S/ 25 | S/ 205 |

B es el costo total menor. A será el más cercano solo cuando sus coordenadas de prueba queden más cerca del origen enviado. Todos los registros tienen marca DEMO y no representan precios ni empresas reales.

## Comparación de lista

El servidor requiere una oferta válida para cada producto. La estrategia de un proveedor solo se considera cuando una sucursal del mismo proveedor cubre todas las variantes. En la estrategia dividida, asigna cada producto a una oferta compatible y cobra delivery una vez por sucursal; aplica envío gratis con el subtotal acumulado de esa sucursal.

Cuando hay hasta 8 productos y no más de 50.000 asignaciones posibles, evalúa todas las combinaciones y selecciona el menor total. Para listas más grandes elige el menor costo de producto por línea y marca el resultado `GREEDY_APPROXIMATION`; no se presenta como óptimo global y no incorpora el posible ahorro logístico global al elegir cada línea.
