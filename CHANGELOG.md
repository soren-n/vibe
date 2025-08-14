# [1.4.0](https://github.com/soren-n/vibe-mcp/compare/v1.3.1...v1.4.0) (2025-08-14)

### Bug Fixes

- add missing conventional-changelog-conventionalcommits dependency ([bfee550](https://github.com/soren-n/vibe-mcp/commit/bfee550d76fee4d6fbe66f0609f3face2cc27d69))
- disable committerDate in release notes to resolve Invalid time value error ([ffb8ccc](https://github.com/soren-n/vibe-mcp/commit/ffb8ccc5544d5d87be0c1bfc186f8a46a16d1e9d))
- switch to angular preset to avoid committerDate error ([fe0938c](https://github.com/soren-n/vibe-mcp/commit/fe0938cc0367d479e4b894f7eaa87d13461a1e3d))

### Features

- ensure sessions are stored in user's project .vibe directory ([6987f4c](https://github.com/soren-n/vibe-mcp/commit/6987f4c042a8dc8e63627644c0465570e4fbbc57))

## [1.3.1](https://github.com/soren-n/vibe-mcp/compare/v1.3.0...v1.3.1) (2025-08-13)

### Bug Fixes

- Add shebang line to CLI and improve data path resolution for npm package ([0e77cfe](https://github.com/soren-n/vibe-mcp/commit/0e77cfea72f2954132580b8833d2d08cd8f8e16d))
- Clean JSON output by suppressing logging in production builds ([99ce57c](https://github.com/soren-n/vibe-mcp/commit/99ce57cd014887fd2038de3f47674229f371a68e))

## [1.3.0](https://github.com/soren-n/vibe-mcp/compare/v1.2.1...v1.3.0) (2025-08-13)

### Features

- add comprehensive dependency quality gate system ([1ec3e10](https://github.com/soren-n/vibe-mcp/commit/1ec3e10a0a7aaba24d425d9c7dff538d6ea4dfe8))
- add knip dependency validation to git commit hooks ([5559f64](https://github.com/soren-n/vibe-mcp/commit/5559f64428fe3270e5e81caf972da5e72d3e7cd9))

### Bug Fixes

- apply Rollup workaround to release workflow ([15f1781](https://github.com/soren-n/vibe-mcp/commit/15f17812b31e6e23b88c1364d0522c0e7a588769))
- **ci:** resolve Rollup platform dependency issues in GitHub Actions ([5716f81](https://github.com/soren-n/vibe-mcp/commit/5716f81624b394ca071f94a1a53b1268e3f346fc))
- resolve Rollup dependency issue in CI by configuring Vitest to use Node.js forks ([d870328](https://github.com/soren-n/vibe-mcp/commit/d870328ec6721da859a77464559e38585ef24a8a))
- Resolve Vitest/Rollup dependency issue in CI ([f017db3](https://github.com/soren-n/vibe-mcp/commit/f017db30adda519483bda6f81780e60ef26b8e6f))

## [1.2.1](https://github.com/soren-n/vibe-mcp/compare/v1.2.0...v1.2.1) (2025-08-13)

### Bug Fixes

- ensure all workflow steps and checklist items end with periods ([ead6117](https://github.com/soren-n/vibe-mcp/commit/ead611758ad3a703434cf4837c46339f5be56d32))

## [1.2.0](https://github.com/soren-n/vibe-mcp/compare/v1.1.1...v1.2.0) (2025-08-13)

### Features

- implement proper MCP server with vibe-guide naming ([0303a65](https://github.com/soren-n/vibe-mcp/commit/0303a654c25f7a98212600437953319d135f7857))

## [1.1.1](https://github.com/soren-n/vibe-mcp/compare/v1.1.0...v1.1.1) (2025-08-13)

### Bug Fixes

- platform compatibility by removing unnecessary rollup dependency ([7dceaf9](https://github.com/soren-n/vibe-mcp/commit/7dceaf98a3c02decc24e479eea96b74769a3b1e5))

## [1.1.0](https://github.com/soren-n/vibe-mcp/compare/v1.0.0...v1.1.0) (2025-08-13)

### Features

- add test coverage support and fix deprecation warnings ([3dd025a](https://github.com/soren-n/vibe-mcp/commit/3dd025a4315eb215cb16d5839b9bec0fa905db95))
- clean up project dependencies and fix test naming ([b8621b9](https://github.com/soren-n/vibe-mcp/commit/b8621b93010c0769ff3e8efd7c0b44ddd97b5493))
- enhance CI/CD workflows and fix package.json paths ([c792cb1](https://github.com/soren-n/vibe-mcp/commit/c792cb178a4fab58cad1204bf277787619d8a30b))
- implement comprehensive test fixture system ([0b8eee7](https://github.com/soren-n/vibe-mcp/commit/0b8eee7023f1244fce32afa4e4a25df33dabefac))

### Bug Fixes

- add missing build step to release workflow semantic-release job ([f8295c0](https://github.com/soren-n/vibe-mcp/commit/f8295c0da37cf640da26f42558a0fd2d856fc304))
- add rollup dependency workaround to release workflow ([c33128d](https://github.com/soren-n/vibe-mcp/commit/c33128d68d0293c439869aaa9a550fc07d3643ca))
- apply prettier formatting to analyzer, schemas, and ids modules ([f4d24a7](https://github.com/soren-n/vibe-mcp/commit/f4d24a70bb657f67d271de459d5376d0f2cd203e))
- correct CLI command in release workflow validation ([5ed76ca](https://github.com/soren-n/vibe-mcp/commit/5ed76ca4a220e977b8f82e03f7c82ec8597e1042))
- correct CLI path to dist/src/cli.js throughout CI workflow ([e90894b](https://github.com/soren-n/vibe-mcp/commit/e90894bf62fd6f8684cc3f4b64371010296695d7))
- improve CI reliability and remove dependency cleanup issues ([0461277](https://github.com/soren-n/vibe-mcp/commit/046127774f60b9283cd22bef8a8943d6d03947f7))
- improve session monitor test stability ([63ea107](https://github.com/soren-n/vibe-mcp/commit/63ea1070c17bbd4fde9fcb48f732d7bb3ad74aba))
- move build step before quality checks in release workflow ([420c4ff](https://github.com/soren-n/vibe-mcp/commit/420c4ffe6ec52c8688f1985300d93ba00d46f0ca))
- regenerate npm lockfile to resolve CI dependencies ([1d35f7e](https://github.com/soren-n/vibe-mcp/commit/1d35f7e66c09bc2eb83a740ff794e5f5ff99b1cd))
- remove unsupported --format option from list-workflows command ([6d149ca](https://github.com/soren-n/vibe-mcp/commit/6d149ca0cc3d52e8d1727a7378509eaf7c216f86))
- resolve CI issues with missing build step and rollup dependencies ([0f9545e](https://github.com/soren-n/vibe-mcp/commit/0f9545e6196fb962bc0104aca5c32976b7667769))
- resolve CI issues with npm dependencies and CLI path ([22ca70e](https://github.com/soren-n/vibe-mcp/commit/22ca70ec37adb4addf07f9c9a0d00eabc1b6f1bf))
- update CLI to read version dynamically from package.json ([df1befc](https://github.com/soren-n/vibe-mcp/commit/df1befcc1d55ab446b949be68fd1ea9ffa837b14))
- update test file to use correct CLI path dist/src/cli.js ([06f795d](https://github.com/soren-n/vibe-mcp/commit/06f795dfd205b1e051cebd48a8f01efa8349ab9a))

## [1.0.0](https://github.com/soren-n/vibe/compare/v0.6.0...v1.0.0) (2025-08-13)

### Breaking Changes

- **Migration to TypeScript**: Complete migration from Python to TypeScript implementation
- **Architecture Refactor**: Restructured codebase with modern TypeScript patterns
- **CLI Interface**: Updated command structure and options for better usability

### Features

- **TypeScript Implementation**: Full TypeScript rewrite with improved type safety and performance
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
