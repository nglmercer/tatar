# Guía de Publicación de Releases

Este documento explica cómo publicar releases del proyecto Tatar usando los workflows de GitHub Actions.

## Métodos de Publicación

### 1. Publicación Automática (Recomendado)

Para crear un release automáticamente:

1. **Crear un tag con el número de versión:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **El workflow se ejecutará automáticamente:**
   - Compilará la aplicación para Windows, macOS y Linux
   - Creará un release en GitHub con los binarios
   - Usará las notas del CHANGELOG.md

### 2. Publicación Manual (Draft)

Para crear un release manualmente:

1. **Ir a la sección de Actions en GitHub**
2. **Seleccionar el workflow "Release"**
3. **Hacer clic en "Run workflow"**
4. **Completar los parámetros:**
   - `version`: Número de versión (ej: 1.0.0)
   - `draft`: Marcar como true para crear un draft

## Flujo del Workflow

El workflow de release realiza los siguientes pasos:

### 1. Build Multiplataforma
- **Ubuntu**: Compila para Linux x64
- **Windows**: Compila para Windows x64 (.exe)
- **macOS**: Compila para macOS x64

### 2. Empaquetado
- Los binarios se renombran con el formato: `tatar-{os}-{arch}-{version}`
- Se suben como artifacts para el siguiente paso

### 3. Creación del Release
- Crea un release en GitHub con el tag especificado
- Adjunta todos los binarios compilados
- Incluye las notas del CHANGELOG.md

## Versionado

Este proyecto utiliza [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Major**: Cambios incompatibles hacia atrás
- **Minor**: Nuevas funcionalidades compatibles
- **Patch**: Correcciones de errores compatibles

Ejemplos:
- `v1.0.0` - Primera versión estable
- `v1.1.0` - Nuevas funcionalidades
- `v1.0.1` - Corrección de errores

## Pre-requisitos

Antes de publicar:

1. **Asegurarse que todos los tests pasen:**
   ```bash
   bun run test
   cd src-tauri && cargo test
   ```

2. **Verificar el formato del código:**
   ```bash
   cd src-tauri && cargo fmt --all -- --check
   cd src-tauri && cargo clippy -- -D warnings
   ```

3. **Actualizar CHANGELOG.md:**
   - Añadir una nueva sección para la versión
   - Documentar todos los cambios importantes

4. **Actualizar la versión en los archivos:**
   - `package.json` (version)
   - `src-tauri/Cargo.toml` (version)
   - `src-tauri/tauri.conf.json` (version)

## Verificación Post-Release

Después de publicar:

1. **Descargar los binarios del release**
2. **Probar en cada plataforma:**
   - Windows: Ejecutar el .exe
   - macOS: Ejecutar el binario
   - Linux: Ejecutar el binario
3. **Verificar funcionalidad clave:**
   - La aplicación inicia correctamente
   - YouTube Music carga
   - El AdBlock está funcionando
   - El system tray funciona

## Troubleshooting

### El workflow falla en el build
- Verificar que el frontend se construye correctamente: `bun run build`
- Asegurarse que las dependencias están actualizadas: `bun install`

### Los binarios no se adjuntan al release
- Verificar que los artifacts se suben correctamente
- Revisar los nombres de los archivos en el paso de upload

### El release se crea sin notas
- Asegurarse que CHANGELOG.md existe
- Verificar el formato de la sección de versión en CHANGELOG.md

## Ejemplo Completo

Para publicar la versión 1.0.0:

1. **Actualizar versiones en archivos:**
   ```json
   // package.json
   "version": "1.0.0"
   ```
   ```toml
   # src-tauri/Cargo.toml
   version = "1.0.0"
   ```

2. **Actualizar CHANGELOG.md:**
   ```markdown
   ## [1.0.0] - 2024-11-02
   ### Added
   - Primera versión estable
   - Implementación de AdBlock
   ```

3. **Commit y tag:**
   ```bash
   git add .
   git commit -m "Release v1.0.0"
   git tag v1.0.0
   git push origin main --tags
   ```

4. **Esperar a que el workflow complete**
5. **Verificar el release en GitHub**

## Drafts

Para crear un draft (útil para revisión antes de publicación):

1. **Usar el método manual con `draft: true`**
2. **Revisar el release en GitHub**
3. **Editar y publicar cuando esté listo**

Los drafts son visibles solo para los colaboradores del repositorio.