"""
Deploy the Method Atlas to upo.digital/atlas via Hostinger SFTP.

Usage:
    python deploy_atlas.py

Excludes (won't be uploaded):
    - biblio/*.pdf  (heavy bibliography)
    - .git, .claude
    - screenshots/, uploads/, ejemplo.png
    - deploy_atlas.py itself
"""
import os, sys, posixpath, fnmatch
import paramiko

HOST = "82.25.113.179"
PORT = 65002
USER = "u262522767"
PASS = "***REMOVED***"
LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))
REMOTE_ROOT = "domains/upo.digital/public_html/atlas"

# Patterns evaluated against POSIX-style relative paths.
EXCLUDES_DIR = {".git", ".claude", "screenshots", "uploads", "__pycache__"}
EXCLUDE_GLOBS = [
    "biblio/*.pdf",
    "ejemplo.png",
    "deploy_atlas.py",
    "chat_config.php",     # uploaded out-of-band; contains the API key
    "*.pyc",
]

def is_excluded(rel_path: str) -> bool:
    for g in EXCLUDE_GLOBS:
        if fnmatch.fnmatch(rel_path, g):
            return True
    parts = rel_path.split("/")
    return any(p in EXCLUDES_DIR for p in parts)

def connect():
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, port=PORT, username=USER, password=PASS,
                look_for_keys=False, allow_agent=False, timeout=20)
    return cli

def sftp_mkdirs(sftp, remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = posixpath.join(cur, p) if cur else p
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)
            print(f"  mkdir {cur}")

def main():
    print(f"Connecting to {HOST}:{PORT} as {USER}…")
    cli = connect()
    sftp = cli.open_sftp()
    print(f"OK. Target: ~/{REMOTE_ROOT}/\n")
    sftp_mkdirs(sftp, REMOTE_ROOT)

    pushed = skipped = 0
    for root, dirs, files in os.walk(LOCAL_ROOT):
        # prune excluded dirs in-place so os.walk doesn't recurse into them
        dirs[:] = [d for d in dirs if d not in EXCLUDES_DIR]
        rel_dir = os.path.relpath(root, LOCAL_ROOT).replace(os.sep, "/")
        if rel_dir == ".":
            rel_dir = ""
        if rel_dir and is_excluded(rel_dir + "/"):
            continue
        rdir = REMOTE_ROOT if not rel_dir else posixpath.join(REMOTE_ROOT, rel_dir)
        sftp_mkdirs(sftp, rdir)

        for f in files:
            rel_path = f if not rel_dir else f"{rel_dir}/{f}"
            if is_excluded(rel_path):
                skipped += 1
                continue
            local_f = os.path.join(root, f)
            remote_f = posixpath.join(rdir, f)
            sftp.put(local_f, remote_f)
            pushed += 1
            print(f"  put  {rel_path}")

    sftp.close()
    cli.close()
    print(f"\nDone. {pushed} files uploaded, {skipped} files skipped (excluded).")
    print(f"Open: https://upo.digital/atlas/")

if __name__ == "__main__":
    main()
