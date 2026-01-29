---
title: StringOrDefault Function Implementation
summary: This implementation adds `StringOrDefault` and `Float64OrDefault` functions to the `utils` package, creating congruent helper functions that work...
tags: ['archive', 'implementation', 'summary']
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---

# StringOrDefault Function Implementation

## Overview

This implementation adds `StringOrDefault` and `Float64OrDefault` functions to the `utils` package, creating congruent helper functions that work with the existing `StringPtr` and `Float64Ptr` functions.

## Issue Resolution

The issue highlighted an inconsistency where:

- `StringPtr` returns `nil` for empty strings
- A potential `StringOrDefault` function was treating empty strings as falsy

This created a problem: if someone explicitly set a value to an empty string (non-nil pointer to empty string), it would be incorrectly replaced with the default value.

## Solution

The new functions check **only for nil**, not for empty/zero values:

### StringOrDefault

```go
func StringOrDefault(s *string, defaultValue string) string {
    if s != nil {
        return *s
    }
    return defaultValue
}
```

This allows:

- `nil` → returns default value
- `&""` (pointer to empty string) → returns empty string ""
- `&"value"` → returns "value"

### Float64OrDefault

```go
func Float64OrDefault(f *float64, defaultValue float64) float64 {
    if f != nil {
        return *f
    }
    return defaultValue
}
```

This allows:

- `nil` → returns default value
- `&0.0` (pointer to zero) → returns 0.0
- `&30.5` → returns 30.5

## Congruence with Existing Functions

The implementation maintains consistency with the existing pattern:

- `StringPtr("")` → `nil` (treats empty as "no value")
- `StringOrDefault(nil, "default")` → `"default"` (only nil triggers default)
- `StringOrDefault(&"", "default")` → `""` (explicit empty is preserved)

This pattern allows developers to distinguish between:

1. **No value set** (nil) - use default
2. **Explicitly set to empty/zero** (non-nil pointer) - use the explicit value

## Tests

Comprehensive tests cover all scenarios:

- Non-nil pointer with non-empty value
- Non-nil pointer with empty/zero value (critical test case)
- Nil pointer with non-empty default
- Nil pointer with empty/zero default

## Security Summary

No security vulnerabilities were introduced by these changes. CodeQL analysis returned 0 alerts.
