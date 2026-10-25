#!/bin/sh
# Header and routing checks, run inside the container: docker exec -i <name> sh -s < scripts/smoke-test.sh
# Reports every failing check with the response headers, then exits non-zero.
fail=0
chk() {
  url=$1
  pattern=$2
  out=$(wget -S -q -O /dev/null "http://127.0.0.1:8080$url" 2>&1 || true)
  if echo "$out" | grep -qi "$pattern"; then
    echo "ok   $url  $pattern"
  else
    echo "FAIL $url  expected: $pattern"
    echo "$out" | sed 's/^/     | /'
    fail=1
  fi
}

chk /             "HTTP/1.1 200"
chk /             "X-Frame-Options: DENY"
chk /             "frame-ancestors"
chk /exams        "HTTP/1.1 200"
chk /exams.html   "HTTP/1.1 301"
chk /exams/       "HTTP/1.1 301"
chk /no-such-page "HTTP/1.1 404"
chk /sw.js        "Cache-Control: no-cache"
exit $fail
