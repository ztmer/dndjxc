from __future__ import annotations

import os
import sys

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
PW = os.environ["SHOP_SSH_PASS"]


def show(text: str) -> None:
    text = text.replace(PW, "***")
    sys.stdout.buffer.write(text.encode("utf-8", "replace")[:8000] + b"\n")
    sys.stdout.buffer.flush()


def sudo(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(f"sudo -S -p '' {cmd}", timeout=timeout, get_pty=True)
    stdin.write(PW + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    show((out + err).strip()[-6000:])


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=20)
sudo(client, "journalctl -u diannaodian -n 80 --no-pager")
_, stdout, _ = client.exec_command("ls -la /home/ztmer/apps/diannaodian/.env /home/ztmer/apps/diannaodian/package.json; head -5 /home/ztmer/apps/diannaodian/.env", timeout=20)
show(stdout.read().decode("utf-8", "replace"))
client.close()
