"""同步代码到店内服务器。不覆盖 .env 和 prisma/dev.db。密码读 SHOP_SSH_PASS。"""

from __future__ import annotations

import io
import os
import sys
import tarfile
import time
from pathlib import Path

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
REMOTE = "/home/ztmer/apps/diannaodian"
ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", ".next", ".cursor", "scripts", "data"}
SKIP_FILE_NAMES = {".env"}
SKIP_SUFFIX = {".db", ".db-journal"}


def show(text: str) -> None:
    pw = os.environ.get("SHOP_SSH_PASS", "")
    if pw:
        text = text.replace(pw, "***")
    sys.stdout.buffer.write((text or "").encode("utf-8", "replace")[:12000] + b"\n")
    sys.stdout.buffer.flush()


def pack() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            rel_dir = Path(dirpath).relative_to(ROOT)
            if any(p in SKIP_DIRS for p in rel_dir.parts):
                continue
            for name in filenames:
                if name in SKIP_FILE_NAMES or name.startswith(".env"):
                    continue
                if Path(name).suffix in SKIP_SUFFIX:
                    continue
                full = Path(dirpath) / name
                arc = str(full.relative_to(ROOT)).replace("\\", "/")
                tar.add(full, arcname=arc)
    return buf.getvalue()


def run(client, cmd: str, timeout: int = 120, check: bool = True) -> str:
    show(">> " + cmd[:200])
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        show(text[-8000:])
    if check and code != 0:
        raise RuntimeError(f"exit {code}: {cmd}")
    return text


def sudo(client, cmd: str, password: str, timeout: int = 60, check: bool = True) -> str:
    show(">> sudo " + cmd[:180])
    stdin, stdout, stderr = client.exec_command(f"sudo -S -p '' {cmd}", timeout=timeout, get_pty=True)
    stdin.write(password + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        show(text[-4000:])
    if check and code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}")
    return text


def main() -> None:
    password = os.environ["SHOP_SSH_PASS"]
    show("packing…")
    blob = pack()
    show(f"pack bytes {len(blob)}")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=20)
    sftp = client.open_sftp()
    with sftp.file("/tmp/diannaodian-web.tgz", "wb") as f:
        f.write(blob)
    sftp.close()
    sudo(client, "systemctl stop diannaodian.service", password, check=False)
    try:
        run(client, f"mkdir -p {REMOTE} && tar -xzf /tmp/diannaodian-web.tgz -C {REMOTE}")
        run(client, f"test -f {REMOTE}/.env && test -f {REMOTE}/prisma/dev.db && echo KEEP_ENV_DB")
        show("npm install…")
        run(client, f"cd {REMOTE} && npm install", timeout=700)
        run(client, f"cd {REMOTE} && npx prisma generate && npx prisma db push", timeout=180)
        show("webpack production build…")
        run(client, f"cd {REMOTE} && npx next build --webpack", timeout=800)
        run(client, f"test -f {REMOTE}/.next/BUILD_ID && test -f {REMOTE}/.next/routes-manifest.json && echo MANIFESTS_OK")
    except Exception:
        show("BUILD_FAILED_RESTART_OLD")
        sudo(client, "systemctl start diannaodian.service", password, check=False)
        raise
    sudo(client, "systemctl reset-failed diannaodian.service", password, check=False)
    sudo(client, "systemctl start diannaodian.service", password)
    time.sleep(3)
    sudo(client, "systemctl is-active diannaodian.service", password)
    run(client, "curl -sI -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3010/login")
    client.close()
    show("OK http://192.168.10.104:3010")


if __name__ == "__main__":
    main()
