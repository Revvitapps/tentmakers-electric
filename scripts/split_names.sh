
set -euo pipefail
IN="${1:?Usage: ./split_names.sh input.csv [output.csv]}"
OUT="${2:-$(dirname "$IN")/$(basename "${IN%.*}")_with_First_Last.csv"}"

python3 - <<'PY' "$IN" "$OUT"
import csv, sys, re, os
inp, outp = sys.argv[1], sys.argv[2]
with open(inp, 'r', encoding='utf-8-sig', newline='') as f:
    rows = list(csv.reader(f))
if not rows: raise SystemExit("Empty CSV")
header, data = rows[0], rows[1:]
lower = {h.lower(): h for h in header}
def anycol(keys): return next((lower[k] for k in keys if k in lower), None)
first_col = anycol(["first name","firstname","first"])
last_col  = anycol(["last name","lastname","last","surname","family name"])
cands = ["Full Name","Name","Customer Name","Contact Name","Client Name","First and Last Name","Fullname","Customer"]
full_col = None
if not (first_col and last_col):
  for c in cands:
    if c.lower() in lower: full_col = lower[c.lower()]; break
def split_name(s):
  s=(s or "").strip()
  if not s: return "",""
  parts=re.split(r"\s+", s)
  return (parts[0], " ".join(parts[1:])) if len(parts)>1 else (parts[0], "")
new_header=["First Name","Last Name"]+header
out_rows=[new_header]
for r in data:
  def gv(h):
    try: i=header.index(h); return r[i] if i < len(r) else ""
    except ValueError: return ""
  if first_col and last_col: first,last = gv(first_col), gv(last_col)
  elif full_col: first,last = split_name(gv(full_col))
  else: first,last="",""
  row_pad = r + ([""]*(len(header)-len(r)))
  out_rows.append([first,last]+row_pad)
os.makedirs(os.path.dirname(outp) or ".", exist_ok=True)
with open(outp, 'w', encoding='utf-8', newline='') as f:
  csv.writer(f).writerows(out_rows)
print(outp)
PY
echo "Wrote: $OUT"
