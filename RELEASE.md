# Guía para crear una Release

## Pasos para generar el build

### 1. Asegúrate de tener todo actualizado
```bash
npm install
```

### 2. Generar el build para Windows
```bash
npm run build:win
```

Este comando generará:
- `dist/Facturas Holded Setup 1.0.9.exe` - Instalador para Windows
- `dist/Facturas Holded Setup 1.0.9.exe.blockmap` - Mapa de bloques para actualizaciones
- `dist/latest.yml` - Archivo de metadatos para auto-updater

### 3. Generar build para otras plataformas (opcional)
```bash
# Para macOS
npm run build:mac

# Para Linux
npm run build:linux
```

## Archivos a subir en GitHub Releases

Cuando crees una release en GitHub, sube estos archivos:

### Para Windows:
- ✅ `dist/Facturas Holded Setup 1.0.9.exe` (el instalador principal)
- ⚠️ `dist/Facturas Holded Setup 1.0.9.exe.blockmap` (opcional, para auto-updater)
- ⚠️ `dist/latest.yml` (opcional, para auto-updater)

### Para macOS (si lo generas):
- ✅ `dist/Facturas Holded-1.0.9.dmg`

### Para Linux (si lo generas):
- ✅ `dist/Facturas Holded-1.0.9.AppImage` o
- ✅ `dist/Facturas Holded_1.0.9_amd64.deb`

## Proceso completo

1. **Actualizar versión** (si es necesario):
   - Edita `package.json` y cambia `"version": "1.0.9"` a la nueva versión

2. **Generar el build**:
   ```bash
   npm run build:win
   ```

3. **Verificar los archivos generados**:
   - Ve a la carpeta `dist/`
   - Verifica que el `.exe` se haya generado correctamente

4. **Crear release en GitHub**:
   - Ve a tu repositorio: https://github.com/cr4zyp4y4n/Invoice-Processor
   - Click en "Releases" → "Create a new release"
   - Tag: `v1.0.9` (o la versión que corresponda)
   - Title: `v1.0.9 - Facturas Holded`
   - Description: Describe los cambios de esta versión
   - Sube el archivo: `dist/Facturas Holded Setup 1.0.9.exe`
   - Click en "Publish release"

## Notas importantes

- La carpeta `dist/` está en `.gitignore`, así que los builds NO se suben al repositorio
- Solo sube los archivos de build cuando crees una release en GitHub
- El archivo `.exe` puede ser grande (100-200MB), así que GitHub puede tardar en subirlo
- Si usas auto-updater, también sube `latest.yml` y el `.blockmap`


