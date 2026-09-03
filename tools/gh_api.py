#!/usr/bin/env python3
"""GitHub API through the credentials git already holds (Git Credential Manager).
The token is read in-process and never printed.  Usage:
  python tools/gh_api.py whoami
  python tools/gh_api.py create <name> [--private]
  python tools/gh_api.py pages <owner/repo> <cname>
  python tools/gh_api.py get <path>
"""
import json, subprocess, sys, urllib.request, urllib.error
NL = chr(10)

def token():
    out = subprocess.run(["git", "credential", "fill"], input="protocol=https" + NL + "host=github.com" + NL + NL,
                         capture_output=True, text=True).stdout
    kv = dict(l.split("=", 1) for l in out.splitlines() if "=" in l)
    return kv.get("username", ""), kv.get("password", "")

def call(method, path, body=None):
    user, tok = token()
    if not tok: raise SystemExit("no github credential stored")
    req = urllib.request.Request("https://api.github.com" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + tok, "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ghp-deploy", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, dict(r.headers), (json.loads(r.read() or b"null"))
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), json.loads(e.read() or b"null")

cmd = sys.argv[1]
if cmd == "whoami":
    st, h, j = call("GET", "/user")
    print(st, (j or {}).get("login"), "scopes:", h.get("X-OAuth-Scopes") or h.get("x-oauth-scopes"))
elif cmd == "create":
    name = sys.argv[2]; private = "--private" in sys.argv
    st, h, j = call("POST", "/user/repos", {"name": name, "private": private, "has_issues": False, "has_wiki": False, "has_projects": False,
                                            "description": "glasshourproductions.com: coming soon page + staging skeleton (Vite, React, three.js)"})
    print(st, (j or {}).get("html_url") or j)
elif cmd == "pages":
    repo, cname = sys.argv[2], sys.argv[3]
    st, h, j = call("POST", f"/repos/{repo}/pages", {"build_type": "workflow"})
    print("enable", st, (j or {}).get("message", (j or {}).get("html_url")))
    st, h, j = call("PUT", f"/repos/{repo}/pages", {"cname": cname, "build_type": "workflow"})
    print("cname", st, j if st >= 300 else "ok")
    st, h, j = call("GET", f"/repos/{repo}/pages")
    print("pages", st, {k: (j or {}).get(k) for k in ("html_url", "cname", "status", "https_enforced", "build_type")})
elif cmd == "get":
    st, h, j = call("GET", sys.argv[2])
    print(st, json.dumps(j, indent=1)[:2500])
