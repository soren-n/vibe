## [1.0.0](https://github.com/soren-n/vibe/compare/v0.6.0...v1.0.0) (2025-08-13)

### Breaking Changes

- **Migration to TypeScript**: Complete migration from Python to TypeScript implementation
- **Architecture Refactor**: Restructured codebase with modern TypeScript patterns
- **CLI Interface**: Updated command structure and options for better usability

### Features

- **TypeScript Implementation**: Full TypeScript rewrite with improved type safety and performance
- **Enhanced VS Code Extension**: Improved extension with better integration and features
- **Workflow System**: Refined workflow orchestration with better error handling
- **Session Management**: Enhanced session monitoring and management capabilities
- **Checklist Integration**: Improved checklist system with better validation

### Documentation

- **API Documentation**: Updated all API documentation for TypeScript implementation
- **Architecture Guides**: Comprehensive architecture documentation
- **Migration Guide**: Added guidance for users migrating from previous versions

## [0.6.0](https://github.com/soren-n/vibe/compare/v0.5.1...v0.6.0) (2025-08-12)

### Features

- Add comprehensive CLI lint tests for major coverage improvement ([9c9b5eb](https://github.com/soren-n/vibe/commit/9c9b5eba865742f45d75b7fa0e38de6fc6a06a05))
- Add comprehensive CLI tests for improved coverage ([a257203](https://github.com/soren-n/vibe/commit/a257203c0f07ed7611308d9f1d1e46d72b9f22a3))
- Add comprehensive CLI validation tests ([4f1ca1b](https://github.com/soren-n/vibe/commit/4f1ca1b00b8b05fd0e76db82b4a122ca2e7f8d31))
- Add comprehensive project linting system ([2a65721](https://github.com/soren-n/vibe/commit/2a65721145d7b8d9698fae4261329ec1d10ba8bc))
- complete workflow refactoring with checklist system ([829c27a](https://github.com/soren-n/vibe/commit/829c27a541e9bc9e87398678b01ec6ab05011578))
- implement comprehensive session monitoring and workflow management system ([5d4bd8a](https://github.com/soren-n/vibe/commit/5d4bd8a8afc02f8b249b0931f43731dee53d70d9))
- repository cleanup and restructuring complete ([3a5e3a3](https://github.com/soren-n/vibe/commit/3a5e3a33656ebbd9f5811be35a791fe74e6adfd1))

### Bug Fixes

- auto-format after type annotation changes ([0c59c94](https://github.com/soren-n/vibe/commit/0c59c941cc2f9b73a9287db817297e0f2185044c))
- auto-format type annotations after ruff formatting ([885ae90](https://github.com/soren-n/vibe/commit/885ae9023acc1305ed0758f8b909b22dfbe6660a))
- Code quality improvements in orchestrator ([fe96b4d](https://github.com/soren-n/vibe/commit/fe96b4de6b79753d51630db912d85dbdef7e5f97))
- correct workflow validation import path in release pipeline ([1eb2cbe](https://github.com/soren-n/vibe/commit/1eb2cbe5e302305ef9e21449ca4478ba51c6220f))
- resolve linting issues and test environment for release pipeline ([c920f22](https://github.com/soren-n/vibe/commit/c920f221cc7f1e12bbf21b7b9bc5ae930dacf015))
- resolve mypy type checking errors for release pipeline ([5cc42ee](https://github.com/soren-n/vibe/commit/5cc42eed9fb81f4a7f63ffb219318ce086ddedb4))
- resolve test failures for release pipeline ([e900a27](https://github.com/soren-n/vibe/commit/e900a27c8436a85ce4a5392083f960cb34e97484))
- update test expectations after restructuring ([8d2f888](https://github.com/soren-n/vibe/commit/8d2f888aa5931ee46d155e93f7c1dadea89559a4))

## [0.5.1](https://github.com/soren-n/vibe/compare/v0.5.0...v0.5.1) (2025-08-11)

### Bug Fixes

- MCP tools now respect caller's working directory ([e7a54a5](https://github.com/soren-n/vibe/commit/e7a54a58df3504e7dfaed2c2911165bffa10f3b2))

## [0.5.0](https://github.com/soren-n/vibe/compare/v0.4.3...v0.5.0) (2025-08-11)

### Features

- add hot reloading and schema validation ([87adec3](https://github.com/soren-n/vibe/commit/87adec31bf7f50db3e5f40fb24cb6c678115f2c8))

## [0.4.3](https://github.com/soren-n/vibe/compare/v0.4.2...v0.4.3) (2025-08-11)

### Bug Fixes

- checkout latest git tag in publishing jobs for proper versioning ([4fa68b2](https://github.com/soren-n/vibe/commit/4fa68b213202bf0d626a23369a95b63b117376eb))

## [0.4.2](https://github.com/soren-n/vibe/compare/v0.4.1...v0.4.2) (2025-08-11)

### Bug Fixes

- ensure publishing jobs fetch git tags for proper versioning ([aca42a2](https://github.com/soren-n/vibe/commit/aca42a2e407aeeb9a6f4a664500685da686a34a5))

## [0.4.1](https://github.com/soren-n/vibe/compare/v0.4.0...v0.4.1) (2025-08-11)

### Bug Fixes

- add TestPyPI publishing step to release workflow ([3e96c38](https://github.com/soren-n/vibe/commit/3e96c38db69c60fc9fdddcc2a4961fbffac873ba))

## [0.4.0](https://github.com/soren-n/vibe/compare/v0.3.0...v0.4.0) (2025-08-11)

### Features

- add TestPyPI publishing workflows ([a640f65](https://github.com/soren-n/vibe/commit/a640f65ae7d2e527c36c337cb39318db080ce54d))

## [0.3.0](https://github.com/soren-n/vibe/compare/v0.2.3...v0.3.0) (2025-08-11)

### Features

- rename package to vibe-soren-n for PyPI publishing ([d643dee](https://github.com/soren-n/vibe/commit/d643deec88a40c5a8ac9121284847496de4336f7))

## [0.2.3](https://github.com/soren-n/vibe/compare/v0.2.2...v0.2.3) (2025-08-11)

### Bug Fixes

- properly pass VSCE_PAT environment variable to semantic-release ([544ed14](https://github.com/soren-n/vibe/commit/544ed14ad210d2857b2eeed71bd0d525d85664e6))

## [0.2.2](https://github.com/soren-n/vibe/compare/v0.2.1...v0.2.2) (2025-08-11)

### Bug Fixes

- update vsce authentication to use environment variable instead of deprecated --pat flag ([affc328](https://github.com/soren-n/vibe/commit/affc328e647ddcdb89c55d6327961fcf384b3176))

# Changelog

All notable changes to the Vibe project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-08-11

### Added

- Comprehensive research guidance fallback for unmatched queries
- Dynamic workflow discovery with timestamp-based cache invalidation
- VS Code extension with MCP integration
- Universal project release workflows
- Image conversion workflows with ImageMagick

### Changed

- Enhanced analyzer with smart fallback logic
- Improved workflow orchestration and guidance generation
- Updated workflow YAML schema validation

### Fixed

- Removed FFmpeg from image conversion workflow (focused on static images)
- Resolved workflow schema validation issues
- Fixed duplicate function definitions in loader
- Added proper type annotations to resolve mypy errors

## [0.1.0] - 2025-01-01

### Added

- Initial release of Vibe workflow orchestration system
- Core workflow engine with YAML-based definitions
- Natural language query processing
- MCP server integration
- Basic CI/CD pipeline
