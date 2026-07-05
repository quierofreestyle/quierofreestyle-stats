# Herramienta de generación de JSON

Esta herramienta convierte el CSV descargado desde Google Sheets en los archivos JSON usados por la web.

## Flujo de actualización

1. Abrir Google Sheets.
2. Ir a `Archivo > Descargar > Valores separados por comas (.csv)`.
3. Guardar el archivo como:

```txt
imports/datos-2026.csv
```

4. Desde la carpeta raíz del proyecto, ejecutar:

```bash
node tools/generar-json.js
```

5. Se actualizan automáticamente:

```txt
data/eventos.json
data/competidores.json
data/competencias.json
data/metadata.json
```

## Columnas esperadas

La hoja debe tener estas columnas:

```txt
Fecha, Compe, Campeón, Segundo, Modalidad, Tipo de compe
```

## Ruta personalizada

También podés ejecutar el generador con una ruta específica:

```bash
node tools/generar-json.js ./imports/mi-archivo.csv
```

## Importante

El generador conserva datos manuales existentes en `competidores.json` y `competencias.json`, como fotos, Instagram, ciudad y descripción, siempre que el `id` coincida.
