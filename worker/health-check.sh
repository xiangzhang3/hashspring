#!/bin/bash
# HashSpring Worker Health Check
# 检查 worker 是否在运行，如果崩溃/丢失则自动重启
# 支持两种情况：进程存在但停止 → restart，进程丢失 → start

WORKER_DIR="$HOME/hashspring-next/worker"

STATUS=$(pm2 jlist 2>/dev/null | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{const j=JSON.parse(d);const w=j.find(p=>p.name==='hashspring-worker');
console.log(w?w.pm2_env.status:'not_found')}catch{console.log('error')}")

start_worker() {
  cd "$WORKER_DIR" || exit 1
  pm2 delete hashspring-worker 2>/dev/null
  pm2 start index.js --name hashspring-worker \
    --max-memory-restart 512M \
    --restart-delay 5000 \
    --max-restarts 10 \
    --time \
    --log-date-format "YYYY-MM-DD HH:mm:ss"
  pm2 save 2>/dev/null
}

if [ "$STATUS" = "not_found" ] || [ "$STATUS" = "error" ]; then
  # PM2 完全没有这个进程 → 尝试 resurrect，失败则 start
  echo "[$(date)] Worker not found in PM2 (status: $STATUS), starting fresh..."
  pm2 resurrect 2>/dev/null
  # 再次检查
  STATUS2=$(pm2 jlist 2>/dev/null | node -e "
  const d=require('fs').readFileSync('/dev/stdin','utf8');
  try{const j=JSON.parse(d);const w=j.find(p=>p.name==='hashspring-worker');
  console.log(w?w.pm2_env.status:'not_found')}catch{console.log('error')}")
  if [ "$STATUS2" != "online" ]; then
    echo "[$(date)] Resurrect failed, starting worker from scratch..."
    start_worker
  else
    echo "[$(date)] Worker restored via pm2 resurrect"
  fi
elif [ "$STATUS" != "online" ]; then
  # 进程存在但状态异常 (stopped/errored) → restart
  echo "[$(date)] Worker not online (status: $STATUS), restarting..."
  pm2 restart hashspring-worker 2>/dev/null || start_worker
  echo "[$(date)] Worker restarted"
else
  # Worker 在线 — 检查是否卡住（日志超过 10 分钟没更新）
  LAST_LOG=$(stat -f %m ~/.pm2/logs/hashspring-worker-out.log 2>/dev/null || \
             stat -c %Y ~/.pm2/logs/hashspring-worker-out.log 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_LOG))
  if [ $DIFF -gt 600 ]; then
    echo "[$(date)] Worker seems stuck (no log for ${DIFF}s), restarting..."
    pm2 restart hashspring-worker
    echo "[$(date)] Worker restarted"
  fi
fi
