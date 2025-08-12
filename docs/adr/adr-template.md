# ADR Template

## ADR-XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Deciders**: [Names or teams involved]

## Context

Problem or issue motivating this decision.

## Decision

Change being proposed or implemented.

## Rationale

Reasoning behind decision and alternatives considered.

## Implementation

Key components and delivery approach.

## Results

Success metrics and benefits realized.

---

## Example Format

### ADR-001: YAML-Based Workflow System

**Date**: 2025-08-10
**Status**: Accepted
**Deciders**: Development Team

**Context**: Hardcoded Python workflows required code changes for updates

**Decision**: YAML-based external definitions with Python fallback

**Rationale**: Code-data separation, independent updates, improved maintainability
**Alternatives Rejected**: JSON (less readable), database (complexity), configuration files (less structured)

**Implementation**: `models.py` dataclass, `loader.py` YAML parsing, `core.py` integration, workflow migration

**Results**: ✅ All workflows migrated, ✅ Zero regression, ✅ Philosophy compliance achieved
