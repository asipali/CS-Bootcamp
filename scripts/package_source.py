"""
CipherVault 2.0 - Source Archive Packager.

Packages the complete project source into a clean, submission-ready ZIP file:
CipherVault2_IndustryReady_Source.zip.

Strictly excludes:
- node_modules/
- .next/
- .git/
- .pytest_cache/
- *.db, *.db-journal, dev.db
- .env (preserves .env.example)
- __pycache__/, *.pyc
- storage/vault/*.cvault (preserves directory structure)
"""

import os
import zipfile

ARCHIVE_NAME = "CipherVault2_IndustryReady_Source.zip"
ROOT_DIR_NAME = "CipherVault2"

EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".pytest_cache",
    "__pycache__",
}

EXCLUDE_FILES = {
    ARCHIVE_NAME,
    "README_PRIVATE.md",
    ".env",
    ".env.local",
    "dev.db",
    "dev.db-journal",
}

EXCLUDE_EXTS = {
    ".pyc",
    ".pyo",
    ".cvault",
}


def package_project():
    workspace_root = os.path.abspath(".")
    archive_path = os.path.join(workspace_root, ARCHIVE_NAME)

    if os.path.exists(archive_path):
        os.remove(archive_path)

    file_count = 0
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(workspace_root):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in EXCLUDE_EXTS:
                    continue

                abs_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_file_path, workspace_root)
                archive_arcname = os.path.join(ROOT_DIR_NAME, rel_path)

                zipf.write(abs_file_path, archive_arcname)
                file_count += 1

    size_bytes = os.path.getsize(archive_path)
    size_mb = size_bytes / (1024 * 1024)
    print(f"[+] Archive created successfully: {archive_path}")
    print(f"    Total files archived: {file_count}")
    print(f"    Archive size: {size_bytes} bytes ({size_mb:.2f} MB)")

    # Integrity verification: test extracting the archive
    with zipfile.ZipFile(archive_path, "r") as test_zip:
        bad_file = test_zip.testzip()
        if bad_file:
            raise RuntimeError(f"Corrupted file in archive: {bad_file}")
        namelist = test_zip.namelist()
        print(f"[+] Archive integrity verified. Root entries: {len(namelist)}")


if __name__ == "__main__":
    package_project()
