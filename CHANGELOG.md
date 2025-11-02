# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-02

### Added
- Implementación completa de AdBlock con las siguientes características:
  - Motor de AdBlock con thread safety usando Arc<Mutex<>>
  - Carga automática de listas EasyList y EasyPrivacy
  - Caché local de listas de filtros con actualización cada 7 días
  - Filtros manuales como respaldo para bloqueo de anuncios comunes
  - Bloqueo de solicitudes de red mediante interceptación JavaScript
  - Filtros cosméticos para ocultar elementos de anuncios
  - Reemplazo de recursos (GIF transparente)
  - Actualización manual de filtros mediante comando Tauri

- Interfaz de usuario para YouTube Music con las siguientes características:
  - Ventana principal con carga de music.youtube.com
  - System tray con menú contextual
  - Minimización a bandeja del sistema
  - Controles de ventana (minimizar, maximizar, cerrar)
  - Soporte para múltiples plataformas (Windows, macOS, Linux)

- Sistema de build automatizado con GitHub Actions:
  - CI/CD para pruebas en múltiples plataformas
  - Verificación de formato de código (clippy, rustfmt)
  - Build automatizado de frontend y backend
  - Workflow para publicación de releases

### Technical Details
- **Backend**: Rust con Tauri 2.1.0
- **Frontend**: HTML/CSS/JavaScript con Vite
- **AdBlock Engine**: Rust adblock crate v0.11.0
- **Dependencies**: ureq para HTTP, tokio para async, serde para JSON
- **Build System**: Tauri CLI con bun como gestor de paquetes

### Known Issues
- Los filtros cosméticos pueden no aplicarse inmediatamente en páginas dinámicas
- La actualización de listas de filtros requiere reinicio de la aplicación

### Development Notes
- El código cumple con todos los estándares de Rust (clippy, rustfmt)
- Implementado thread safety para el motor de AdBlock
- Manejo adecuado de errores y fallbacks
- Sistema de caché robusto con verificación de expiración

## [Unreleased]

### Planned
- Interfaz de configuración para AdBlock
- Estadísticas de bloqueo de anuncios
- Soporte para listas de filtros personalizadas
- Mejoras en el rendimiento del motor de AdBlock
- Modo oscuro/claro para la interfaz

[Unreleased]: https://github.com/2gn/tatar/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/2gn/tatar/releases/tag/v1.0.0