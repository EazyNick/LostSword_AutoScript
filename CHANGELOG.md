# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - 2025-12-07

### Added
- Script activation/deactivation feature with toggle button in dashboard
- Dashboard statistics table (`dashboard_stats`) for performance optimization
- Dashboard statistics API endpoint (`GET /api/dashboard/stats`)
- Script execution history table (`script_executions`) for tracking script runs
- Tag system (`tags`, `script_tags` tables) for script categorization
- Script statistics view (`script_stats`) for aggregated dashboard data
- "Today's failed scripts" stat card in dashboard
- "Inactive scripts" stat card in dashboard
- Script active status management in database (`scripts.active` column)
- Dashboard statistics repository for efficient stat management
- Script execution order management (`scripts.execution_order` column) - determines order for "Run All" execution
- Index for execution order (`idx_scripts_execution_order`) for optimized sorting
- API endpoint for updating script execution order (`PATCH /api/scripts/order`)
- Detailed logging for node execution in `/api/execute-nodes` endpoint

### Changed
- "Run All" button now queries active scripts from server before execution
- "Run All" button only executes scripts with `active = 1` in database
- "Run All" button executes scripts in `execution_order` sequence
- Dashboard and script page now display scripts in the same order (based on `execution_order`)
- Script order is now stored in database (`execution_order` column) instead of user settings
- Dashboard statistics are calculated and cached in database
- Script card status display changed from text to toggle button
- Database schema updated with new tables and columns
- Node execution error handling: Server returns `success: False` when node execution fails
- Node counting logic: Start node always counted as success, End node counted as success on normal completion
- Condition nodes: Counted as success regardless of True/False branch (if no error occurs)
- Unexecuted branch paths from condition nodes are not counted as cancelled

### Fixed
- "Run All" button bug where only 1 script executed instead of all active scripts
- Index mismatch issue when selecting scripts during "Run All" execution
- Dashboard statistics API 500 error (missing method implementation)
- Script order synchronization between dashboard and script page
- Frontend showing success message when server-side node execution fails
- Node counting bug: `failCount` was incremented twice (once in error detection, once in catch block)
- Incorrect cancelled node count due to End node and condition branch paths

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

