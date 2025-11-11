#!/usr/bin/env bash
set -euo pipefail
IN="${1:?Usage: ./split_names.sh input.csv [output.csv]}"
in_dir=$(dirname -- "$IN")
in_base=$(basename -- "${IN%.*}")
OUT="${2:-${in_dir}/${in_base}_with_First_Last.csv}"

python3 - "$IN" "$OUT" <<'PY'
import csv
import os
import re
import sys

NAME_FIRST_HEADERS = [
    "first name",
    "firstname",
    "first",
    "given name",
]

NAME_LAST_HEADERS = [
    "last name",
    "lastname",
    "last",
    "surname",
    "family name",
]

NAME_FULL_HEADERS = [
    "full name",
    "name",
    "customer name",
    "contact name",
    "client name",
    "first and last name",
    "fullname",
    "customer",
]

EMAIL_HEADERS = [
    "email",
    "email address",
    "e-mail",
    "emailaddress",
    "mail",
]


def normalize(value: str) -> str:
    return value.strip().lower()


def load_rows(path: str):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        raise SystemExit("Empty CSV")
    return rows[0], rows[1:]


def build_header_map(header):
    mapping = {}
    for idx, name in enumerate(header):
        key = normalize(name) if name else ""
        if key and key not in mapping:
            mapping[key] = idx
    return mapping


def column_values(data, idx):
    return [row[idx] if idx < len(row) else "" for row in data]


def ratio(values, predicate):
    hits = total = 0
    for raw in values:
        value = raw.strip()
        if not value:
            continue
        total += 1
        if predicate(value):
            hits += 1
    return (hits / total) if total else 0.0


def looks_like_full_name(value: str) -> bool:
    parts = [segment for segment in re.split(r"\s+", value.strip()) if segment]
    if len(parts) < 2:
        return False
    return any(char.isalpha() for char in value)


def looks_like_email(value: str) -> bool:
    return bool(re.match(r"[^@\s]+@[^@\s]+\.[^@\s]+", value))


def best_column_by_data(data, total_cols, predicate, min_score):
    best_idx = None
    best_score = 0.0
    for idx in range(total_cols):
        score = ratio(column_values_cache[idx], predicate)
        if score > best_score:
            best_score = score
            best_idx = idx
    return best_idx if best_idx is not None and best_score >= min_score else None


def get_value(row, idx):
    if idx is None:
        return ""
    return row[idx] if idx < len(row) else ""


header, data = load_rows(sys.argv[1])
header_map = build_header_map(header)
total_columns = len(header)
column_values_cache = {idx: column_values(data, idx) for idx in range(total_columns)}


def find_by_header(options):
    for option in options:
        idx = header_map.get(normalize(option))
        if idx is not None:
            return idx
    return None


first_idx = find_by_header(NAME_FIRST_HEADERS)
last_idx = find_by_header(NAME_LAST_HEADERS)

full_idx = None
if not (first_idx is not None and last_idx is not None):
    full_idx = find_by_header(NAME_FULL_HEADERS)
    if full_idx is None:
        full_idx = best_column_by_data(
            data,
            total_columns,
            looks_like_full_name,
            min_score=0.25,
        )

email_idx = find_by_header(EMAIL_HEADERS)
if email_idx is None:
    email_idx = best_column_by_data(
        data,
        total_columns,
        looks_like_email,
        min_score=0.25,
    )


def split_name(value):
    value = (value or "").strip()
    if not value:
        return "", ""
    parts = [segment for segment in re.split(r"\s+", value) if segment]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


new_header = ["First Name", "Last Name", "Email"] + header
out_rows = [new_header]

for row in data:
    first_val = last_val = ""
    if first_idx is not None and last_idx is not None:
        first_val = get_value(row, first_idx)
        last_val = get_value(row, last_idx)
    elif full_idx is not None:
        first_val, last_val = split_name(get_value(row, full_idx))

    email_val = get_value(row, email_idx)
    row_padded = row + [""] * (len(header) - len(row))
    out_rows.append([first_val, last_val, email_val] + row_padded)

out_path = sys.argv[2]
os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
with open(out_path, "w", encoding="utf-8", newline="") as fh:
    csv.writer(fh).writerows(out_rows)

print(out_path)
PY

echo "Wrote: $OUT"
