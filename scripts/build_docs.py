#!/usr/bin/env python3
"""
Build consolidated Clipper documentation
Executes the consolidation plan to create new docs structure
"""

import os
import shutil
from pathlib import Path

OLD_DOCS = Path("/home/onnwee/projects/clipper/docs")
NEW_DOCS = Path("/home/onnwee/projects/clipper/docs_new")

def copy_user_docs():
    """Copy user documentation (already clean)"""
    files = {
        "user-guide.md": "user-guide.md",
        "faq.md": "faq.md",
        "guidelines.md": "community-guidelines.md"
    }
    
    for src, dst in files.items():
        src_path = OLD_DOCS / src
        dst_path = NEW_DOCS / "users" / dst
        if src_path.exists():
            shutil.copy2(src_path, dst_path)
            print(f"✓ users/{dst}")

def copy_simple_docs():
    """Copy docs that don't need consolidation"""
    mappings = {
        "backend": {
            "authentication.md": "authentication.md",
            "RBAC.md": "rbac.md",
            "FEATURE_FLAGS.md": "../operations/feature-flags.md",
        },
        "setup": {},
        "decisions": {},
        ".": {
            "CHANGELOG.md": "changelog.md",
        }
    }
    
    for section, files in mappings.items():
        for src, dst in files.items():
            src_path = OLD_DOCS / src
            if "../" in dst:
                dst_path = NEW_DOCS / dst.replace("../", "")
            else:
                dst_path = NEW_DOCS / section / dst if section != "." else NEW_DOCS / dst
            
            if src_path.exists():
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_path, dst_path)
                print(f"✓ {dst}")

def copy_adr_rfc():
    """Copy ADRs and RFCs to decisions/"""
    # ADRs
    adr_dir = OLD_DOCS / "adr"
    if adr_dir.exists():
        for adr in adr_dir.glob("*.md"):
            if adr.name != "README.md":
                dst = NEW_DOCS / "decisions" / f"adr-{adr.stem.replace('0', '')}.md"
                shutil.copy2(adr, dst)
                print(f"✓ decisions/{dst.name}")
    
    # RFCs
    rfc_dir = OLD_DOCS / "rfcs"
    if rfc_dir.exists():
        for rfc in rfc_dir.glob("*.md"):
            # Convert RFC to ADR format
            num = rfc.stem.split("-")[0]
            name = "-".join(rfc.stem.split("-")[1:])
            dst = NEW_DOCS / "decisions" / f"adr-{int(num)+1:03d}-{name}.md"
            shutil.copy2(rfc, dst)
            print(f"✓ decisions/{dst.name}")

def archive_summaries():
    """Archive implementation summary files"""
    patterns = [
        "*_IMPLEMENTATION_SUMMARY.md",
        "*_SUMMARY.md",
        "DEPLOYMENT_READINESS.md",
        "FINAL_VERIFICATION_REPORT.md",
        "ISSUE-COMPLETION-CHECKLIST.md",
    ]
    
    for pattern in patterns:
        for file in OLD_DOCS.glob(pattern):
            dst = NEW_DOCS / "archive" / file.name
            shutil.copy2(file, dst)
            print(f"✓ archive/{file.name}")

def main():
    print("=== Building Consolidated Documentation ===\n")
    
    print("1. Copying user documentation...")
    copy_user_docs()
    
    print("\n2. Copying simple documentation...")
    copy_simple_docs()
    
    print("\n3. Migrating ADRs and RFCs...")
    copy_adr_rfc()
    
    print("\n4. Archiving implementation summaries...")
    archive_summaries()
    
    print("\n✓ Phase 1 complete - simple copies done")
    print("  Next: Create consolidated documents")

if __name__ == "__main__":
    main()
