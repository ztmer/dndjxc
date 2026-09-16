import sys
import paramiko

host = "192.168.10.104"
user = "ztmer"
password = sys.argv[1]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=20)
cmds = [
    "uname -a",
    "id",
    "which node; node -v 2>/dev/null; which npm; npm -v 2>/dev/null",
    "which python3; which make; which g++; which sudo",
    "ss -lnt 2>/dev/null | head -50 || netstat -lnt | head -50",
    "df -h | head -8",
    "free -h",
    "ls -la ~ | head -20",
]
for c in cmds:
    print("===", c)
    _, stdout, stderr = client.exec_command(c, timeout=30)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    print(out or err)
client.close()
