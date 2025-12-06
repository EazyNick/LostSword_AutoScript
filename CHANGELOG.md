# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2025-12-06

### Added
- Dashboard page with script statistics and management
- Settings page with theme, execution, screenshot, and notification settings
- Light/Dark mode support with system theme detection
- Single Page Application (SPA) structure with page routing
- Theme management system with theme-specific CSS files
- Top-left profile area for user information
- Dynamic header content based on current page
- Keyboard shortcuts page in settings (2-column layout)
- Toast notification system with main content area centering
- Modal positioning relative to main content area (excluding sidebar)

### Changed
- Refactored UI structure: `workflow.html` merged into `index.html`
- Node styling: Icon box + text area layout instead of color-based styling
- Connection lines: Dotted animated lines without arrows
- Node icon management: Centralized in `node-icons.config.js`
- Sidebar structure: Profile moved to top-left, navigation menu added
- Popup positioning: All modals and toasts centered relative to main content area
- Settings keyboard shortcuts: Displayed in 2-column grid layout

### Removed
- Node color selection feature (UI, config, and database)
- `workflow.html` file (merged into `index.html`)
- Node color information from all configuration files

### Fixed
- Main content area display issue (blank screen)
- Sidebar resize black residue issue
- Modal and toast positioning relative to sidebar width

## [0.0.1] - 2025-12-05

### Added
- Basic workflow editor with node-based visual interface
- Node types: Start, End, Action, Click, Wait, Condition, Loop, Image Touch, Process Focus
- Node connection system with SVG-based connection lines
- Sidebar for script management
- Script save/load functionality
- Workflow execution engine
- Node settings modal
- Add node modal
- Canvas panning and zoom functionality

### Changed
- Initial UI implementation before major refactoring

## [0.0.0] - 2025-12-02

### Added
- Initial project structure
- FastAPI server setup
- Basic automation framework
- SQLite database integration
- Core node execution system

### Note
This version is intended for developers who want to build upon the project from scratch. It provides the fundamental structure and core functionality with minimal features.

