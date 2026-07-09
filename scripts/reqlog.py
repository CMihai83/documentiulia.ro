#!/usr/bin/env python3
"""
reqlog — the DocumentIulia requirements/requests logger.

Every user request related to documentiulia.ro — from ANY session — MUST be
logged here (mandatory session protocol, see CLAUDE.md). Append-only JSONL in
the repo (docs/requirements/REQUESTS.jsonl) so it is version-controlled and
survives session/artifact loss; a human-readable REQUESTS.md index is
regenerated on every write.

Usage:
  reqlog.py add "<verbatim user request>" [--interp "..."] [--source "session/chat"]
                [--status logged|planned|in_progress|shipped|parked|rejected]
                [--links "S-58,PR#30"] [--date YYYY-MM-DD]
  reqlog.py list [--status X] [--last N]
  reqlog.py pending            # everything not shipped/rejected
  reqlog.py search "text"
  reqlog.py set-status REQ-### <status> [--links "..."]
  reqlog.py show REQ-###
"""
import argparse, json, os, re, sys, datetime, textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "docs", "requirements")
JSONL = os.path.join(DIR, "REQUESTS.jsonl")
MD = os.path.join(DIR, "REQUESTS.md")
STATUSES = ["logged", "planned", "in_progress", "shipped", "parked", "rejected"]


def load():
    if not os.path.exists(JSONL):
        return []
    out = []
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def next_id(entries):
    mx = 0
    for e in entries:
        m = re.match(r"REQ-(\d+)", e.get("id", ""))
        if m:
            mx = max(mx, int(m.group(1)))
    return f"REQ-{mx + 1:03d}"


def write_all(entries):
    os.makedirs(DIR, exist_ok=True)
    with open(JSONL, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    regen_md(entries)


def regen_md(entries):
    lines = [
        "# DocumentIulia — Requirements / Requests Log",
        "",
        "Append-only via `scripts/reqlog.py` (NEVER edit by hand — regenerated on every write).",
        f"Total: {len(entries)} · " + " · ".join(
            f"{s}: {sum(1 for e in entries if e['status'] == s)}" for s in STATUSES
        ),
        "",
        "| ID | Date | Status | Request | Links |",
        "|---|---|---|---|---|",
    ]
    for e in entries:
        req = e["request"].replace("|", "\\|")
        req = (req[:140] + "…") if len(req) > 140 else req
        lines.append(
            f"| {e['id']} | {e['date']} | **{e['status']}** | {req} | {e.get('links', '')} |"
        )
    with open(MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def cmd_add(a):
    entries = load()
    e = {
        "id": next_id(entries),
        "date": a.date or datetime.date.today().isoformat(),
        "logged_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "source": a.source or "session",
        "request": a.request.strip(),
        "interpretation": (a.interp or "").strip(),
        "status": a.status,
        "links": a.links or "",
    }
    entries.append(e)
    write_all(entries)
    print(f"logged {e['id']} [{e['status']}] {e['request'][:80]}")


def fmt(e, full=False):
    head = f"{e['id']}  {e['date']}  [{e['status']:11}] {e['request'][:100]}"
    if not full:
        return head
    body = [head]
    if e.get("interpretation"):
        body.append("  interp: " + e["interpretation"])
    if e.get("links"):
        body.append("  links : " + e["links"])
    body.append(f"  source: {e.get('source','')} · logged {e.get('logged_at','')}")
    return "\n".join(body)


def cmd_list(a):
    entries = load()
    if a.status:
        entries = [e for e in entries if e["status"] == a.status]
    if a.last:
        entries = entries[-a.last:]
    for e in entries:
        print(fmt(e))
    print(f"-- {len(entries)} shown")


def cmd_pending(a):
    entries = [e for e in load() if e["status"] not in ("shipped", "rejected")]
    for e in entries:
        print(fmt(e))
    print(f"-- {len(entries)} pending")


def cmd_search(a):
    q = a.query.lower()
    hits = [e for e in load()
            if q in e["request"].lower() or q in e.get("interpretation", "").lower()]
    for e in hits:
        print(fmt(e, full=True))
    print(f"-- {len(hits)} match(es)")


def cmd_set_status(a):
    entries = load()
    for e in entries:
        if e["id"] == a.rid:
            e["status"] = a.status
            if a.links:
                e["links"] = (e.get("links", "") + "," + a.links).strip(",")
            e["updated_at"] = datetime.datetime.now().isoformat(timespec="seconds")
            write_all(entries)
            print(f"{a.rid} -> {a.status}")
            return
    sys.exit(f"unknown id {a.rid}")


def cmd_show(a):
    for e in load():
        if e["id"] == a.rid:
            print(fmt(e, full=True))
            return
    sys.exit(f"unknown id {a.rid}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    q = sub.add_parser("add")
    q.add_argument("request")
    q.add_argument("--interp", default="")
    q.add_argument("--source", default="")
    q.add_argument("--status", default="logged", choices=STATUSES)
    q.add_argument("--links", default="")
    q.add_argument("--date", default="")
    q.set_defaults(fn=cmd_add)

    q = sub.add_parser("list")
    q.add_argument("--status", choices=STATUSES)
    q.add_argument("--last", type=int)
    q.set_defaults(fn=cmd_list)

    q = sub.add_parser("pending")
    q.set_defaults(fn=cmd_pending)

    q = sub.add_parser("search")
    q.add_argument("query")
    q.set_defaults(fn=cmd_search)

    q = sub.add_parser("set-status")
    q.add_argument("rid")
    q.add_argument("status", choices=STATUSES)
    q.add_argument("--links", default="")
    q.set_defaults(fn=cmd_set_status)

    q = sub.add_parser("show")
    q.add_argument("rid")
    q.set_defaults(fn=cmd_show)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
