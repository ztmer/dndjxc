"""在店内服务器补知识库条目（upsert，不删店里自建）。密码读 SHOP_SSH_PASS。"""
from __future__ import annotations

import os
import sys

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
REMOTE = "/home/ztmer/apps/diannaodian"
CMD = (
    f"cd {REMOTE} && npx tsx -e "
    "\"import 'dotenv/config'; import { ensureKnowledge } from './src/lib/ensure-knowledge.ts'; "
    "ensureKnowledge().then((r) => { console.log(JSON.stringify(r)); });\""
)


def main() -> None:
    password = os.environ["SHOP_SSH_PASS"]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=20)
    _, stdout, stderr = client.exec_command(CMD, timeout=120)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    sys.stdout.buffer.write((out + err).encode("utf-8", "replace")[:8000] + b"\n")
    client.close()
    if code != 0:
        raise SystemExit(code)


if __name__ == "__main__":
    main()
