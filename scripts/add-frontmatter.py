#!/usr/bin/env python3
"""
Add YAML frontmatter to documentation files that don't have it.
"""

import os
import re
from pathlib import Path
from datetime import date

def has_frontmatter(content):
    """Check if file already has frontmatter."""
    return content.startswith('---\n')

def extract_title_from_content(content):
    """Extract title from first heading or filename."""
    lines = content.split('\n')
    for line in lines[:10]:
        if line.startswith('# '):
            return line[2:].strip()
    return None

def generate_frontmatter(filepath, area):
    """Generate appropriate frontmatter for a file."""
    filename = filepath.stem
    
    # Read existing content
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if has_frontmatter(content):
        return None  # Already has frontmatter
    
    # Extract or generate title
    title = extract_title_from_content(content) or filename.replace('-', ' ').title()
    
    # Generate summary from first paragraph
    summary = ""
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.strip() and not line.startswith('#'):
            summary = line.strip()[:100]
            break
    
    # Determine tags based on filename and area
    tags = [area]
    if 'api' in filename:
        tags.append('api')
    if 'guide' in filename or 'quickref' in filename:
        tags.append('guide')
    if 'test' in filename:
        tags.append('testing')
    if 'security' in filename or 'auth' in filename:
        tags.append('security')
    if 'stripe' in filename or 'subscription' in filename:
        tags.append('payments')
    
    # Generate frontmatter
    frontmatter = f"""---
title: "{title}"
summary: "{summary}"
tags: {tags}
area: "{area}"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: {date.today().strftime('%Y-%m-%d')}
---

"""
    
    return frontmatter + content

def process_directory(docs_path, subdir, area):
    """Process all markdown files in a subdirectory."""
    dir_path = docs_path / subdir
    if not dir_path.exists():
        print(f"Skipping {subdir} - directory not found")
        return
    
    print(f"\n=== Processing {subdir}/ ===")
    count = 0
    
    for md_file in sorted(dir_path.glob('*.md')):
        if md_file.name in ['index.md']:  # Skip index files - handle separately
            continue
        
        new_content = generate_frontmatter(md_file, area)
        if new_content:
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  ✓ Added frontmatter to {md_file.name}")
            count += 1
        else:
            print(f"  - Skipped {md_file.name} (already has frontmatter)")
    
    print(f"  Total: {count} files updated")

def main():
    docs_path = Path('/home/runner/work/clipper/clipper/docs')
    
    # Process each subdirectory with its area
    directories = [
        ('backend', 'backend'),
        ('frontend', 'frontend'),
        ('mobile', 'mobile'),
        ('operations', 'operations'),
        ('premium', 'premium'),
        ('product', 'product'),
        ('setup', 'setup'),
        ('users', 'users'),
        ('pipelines', 'pipelines'),
    ]
    
    for subdir, area in directories:
        process_directory(docs_path, subdir, area)
    
    print("\n✅ Frontmatter generation complete!")

if __name__ == '__main__':
    main()
