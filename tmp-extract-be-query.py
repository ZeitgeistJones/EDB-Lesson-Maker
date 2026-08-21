# -*- coding: utf-8 -*-
import json
import sys

path = r"C:\Users\vtanc\.cursor\projects\c-dev-PPT-Lesson-Maker-for-Classin\agent-transcripts\3c96971e-843b-494a-a9ea-fdb2bdc3980b\3c96971e-843b-494a-a9ea-fdb2bdc3980b.jsonl"
out = r"C:\dev\PPT-Lesson-Maker-for-Classin\tmp-be-user-query.txt"

sys.stdout.reconfigure(encoding="utf-8")

with open(path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        if i != 8296:
            continue
        obj = json.loads(line)
        content = obj.get("message", {}).get("content", [])
        for part in content:
            if part.get("type") == "text":
                with open(out, "w", encoding="utf-8") as w:
                    w.write(part.get("text", ""))
                print("wrote", out, "len", len(part.get("text", "")))
                raise SystemExit(0)

print("not found")
