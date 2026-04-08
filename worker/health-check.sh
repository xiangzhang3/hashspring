#!/bin/bash
# HashSpring Worker Health Check
# 检查 worker 是否在运行，如果崩溃则自动重启

STATUS=$(pm2 jlist 2>/dev/null | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{const j=JSON.parse(d);const w=j.find(p=>p.name==='hashspring-worker');
console.log(w?w.pm2_env.status:'not_found')}catch{console.log('error')}")

if [ "$STATUS" != "online" ]; then
  echo "[$(date)] Worker not online (status: $STATUS), restarting..."
  cd ~/hashspring-next/worker && pm2 restart hashspring-worker
  echo "[$(date)] Worker restarted"
else
  # 检查是否卡住（最后日志超过10分钟没更新）
  LAST_LOG=$(stat -f %m ~/.pm2/logs/hashspring-worker-out.log 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_LOG))
  if [ $DIFF -gt 600 ]; then
    echo "[$(date)] Worker seems stuck (no log for ${DIFF}s), restarting..."
    cd ~/hashspring-next/worker && pm2 restart hashspring-worker
    echo "[$(date)] Worker restarted"
  fi
fi
