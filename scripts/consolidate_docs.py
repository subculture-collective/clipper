#!/usr/bin/env python3
"""
Documentation Consolidation Script for Clipper
Consolidates 129 docs into ~40 organized, DRY documents
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict

# Base paths
OLD_DOCS = Path("/home/onnwee/projects/clipper/docs")
NEW_DOCS = Path("/home/onnwee/projects/clipper/docs_new")
ARCHIVE = NEW_DOCS / "archive"

# Consolidation mappings based on analysis
CONSOLIDATIONS = {
    # Users - simple copies
    "users": {
        "user-guide.md": ["user-guide.md"],
        "faq.md": ["faq.md"],
        "community-guidelines.md": ["guidelines.md"],
    },
    
    # Backend - complex merges
    "backend": {
        "authentication.md": ["authentication.md"],  # Delete AUTHENTICATION.md (duplicate)
        "rbac.md": ["RBAC.md"],
        # database.md, api.md, search.md, semantic-search.md, testing.md need custom consolidation
    },
    
    # Decisions - ADRs and RFCs
    "decisions": {
        "adr-001-semantic-search-vector-db.md": ["adr/001-semantic-search-vector-db.md"],
        "adr-002-mobile-framework.md": ["rfcs/001-mobile-framework-selection.md"],
        "adr-003-advanced-query-language.md": ["rfcs/002-advanced-query-language.md"],
    },
    
    # Root level
    ".": {
        "changelog.md": ["CHANGELOG.md"],
    },
}

# Files to archive (implementation summaries)
ARCHIVE_FILES = [
    "*_IMPLEMENTATION_SUMMARY.md",
    "*_SUMMARY.md",
    "DEPLOYMENT_READINESS.md",
    "FINAL_VERIFICATION_REPORT.md",
    "ISSUE-COMPLETION-CHECKLIST.md",
    "PRODUCTION_HARDENING_SUMMARY.md",
    "PREMIUM_DELIVERABLES_SUMMARY.md",
]

# Duplicates to delete (keep lowercase version)
DELETE_DUPLICATES = [
    "AUTHENTICATION.md",  # Keep authentication.md
]

def copy_simple_files():
    """Copy files that don't need consolidation"""
    for section, files in CONSOLIDATIONS.items():
        section_path = NEW_DOCS / section if section != "." else NEW_DOCS
        section_path.mkdir(parents=True, exist_ok=True)
        
        for new_name, old_files in files.items():
            for old_file in old_files:
                src = OLD_DOCS / old_file
                dst = section_path / new_name
                if src.exists():
                    print(f"Copying {old_file} → {section}/{new_name}")
                    shutil.copy2(src, dst)
                else:
                    print(f"⚠️  Source not found: {old_file}")

def archive_summaries():
    """Move implementation summaries to archive"""
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    
    for pattern in ARCHIVE_FILES:
        for file in OLD_DOCS.glob(pattern):
            dst = ARCHIVE / file.name
            print(f"Archiving {file.name}")
            shutil.copy2(file, dst)

def create_index_files():
    """Create README/index files for each section"""
    sections = {
        "users": "User Documentation",
        "setup": "Development Setup",
        "backend": "Backend Documentation",
        "frontend": "Frontend Documentation",
        "mobile": "Mobile Documentation",
        "pipelines": "Data Pipelines",
        "premium": "Premium Features",
        "operations": "Operations & Deployment",
        "decisions": "Architecture Decisions",
    }
    
    for section, title in sections.items():
        readme_path = NEW_DOCS / section / "README.md"
        readme_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = f"""# {title}

> Documentation for {section} components

## Contents

This section contains documentation for:

[Add list of documents here]

---

[[../index|← Back to Documentation Index]]
"""
        
        with open(readme_path, 'w') as f:
            f.write(content)
        print(f"Created {section}/README.md")

def main():
    print("=== Clipper Documentation Consolidation ===\n")
    
    # Ensure new docs directory exists
    NEW_DOCS.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Copy simple files
    print("\n1. Copying simple files...")
    copy_simple_files()
    
    # Step 2: Archive implementation summaries
    print("\n2. Archiving implementation summaries...")
    archive_summaries()
    
    # Step 3: Create section index files
    print("\n3. Creating section index files...")
    create_index_files()
    
    print("\n✓ Phase 1 complete!")
    print("\nNext steps:")
    print("  - Run consolidation subagents for complex merges")
    print("  - Create glossary.md")
    print("  - Set up validation tooling")
    print("  - Create CI workflow")

if __name__ == "__main__":
    main()
