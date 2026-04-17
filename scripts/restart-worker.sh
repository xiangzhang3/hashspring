#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  HashSpring Worker 一键诊断 + 恢复脚本
#  用法: bash scripts/restart-worker.sh
# ═══════════════════════════════════════════════════════════

set -e
WORKER_DIR="$HOME/hashspring-next/worker"
LOG_FILE="/tmp/hashspring-worker-restart-$(date +%Y%m%d_%H%M%S).log"

echo "╔══════════════════════════════════════════════════╗"
echo "║  HashSpring Worker 诊断 + 恢复                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📅 时间: $(date)"
echo "📝 日志: $LOG_FILE"
echo ""

# 1. 检查 PM2
echo "═══ 1. 检查 PM2 状态 ═══"
if ! command -v pm2 &>/dev/null; then
  echo "❌ PM2 未安装，正在安装..."
  npm install -g pm2
fi

PM2_STATUS=$(pm2 jlist 2>/dev/null | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{const j=JSON.parse(d);const w=j.find(p=>p.name==='hashspring-worker');
if(!w){console.log('not_found')}else{console.log(w.pm2_env.status+' restart:'+w.pm2_env.restart_time+' uptime:'+(Date.now()-w.pm2_env.pm_uptime)+'ms')}}
catch{console.log('error')}" 2>/dev/null || echo "error")

echo "   PM2 Worker 状态: $PM2_STATUS"

# 2. 检查最近日志
echo ""
echo "═══ 2. 最近日志 (最后20行) ═══"
pm2 logs hashspring-worker --lines 20 --nostream 2>/dev/null || echo "   (无日志)"

# 3. 检查环境变量
echo ""
echo "═══ 3. 检查环境变量 ═══"
if [ -f "$WORKER_DIR/.env" ]; then
  SUPABASE_OK=$(grep -c "SUPABASE_URL" "$WORKER_DIR/.env" 2>/dev/null || echo 0)
  ANTHROPIC_OK=$(grep -c "ANTHROPIC_API_KEY" "$WORKER_DIR/.env" 2>/dev/null || echo 0)
  TELEGRAM_OK=$(grep -c "TELEGRAM_BOT_TOKEN" "$WORKER_DIR/.env" 2>/dev/null || echo 0)
  echo "   SUPABASE: $([ $SUPABASE_OK -gt 0 ] && echo '✅' || echo '❌ 缺失')"
  echo "   ANTHROPIC: $([ $ANTHROPIC_OK -gt 0 ] && echo '✅' || echo '❌ 缺失')"
  echo "   TELEGRAM: $([ $TELEGRAM_OK -gt 0 ] && echo '✅' || echo '❌ 缺失')"
else
  echo "   ❌ .env 文件不存在: $WORKER_DIR/.env"
fi

# 4. 检查 Supabase 连通性
echo ""
echo "═══ 4. 检查 Supabase 连通性 ═══"
SUPA_URL=$(grep "SUPABASE_URL" "$WORKER_DIR/.env" 2>/dev/null | cut -d= -f2)
SUPA_KEY=$(grep "SUPABASE_SERVICE_KEY" "$WORKER_DIR/.env" 2>/dev/null | cut -d= -f2)

if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
  LATEST=$(curl -s -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
    "$SUPA_URL/rest/v1/flash_news?select=title,source,pub_date&order=pub_date.desc&limit=3" 2>/dev/null)

  if echo "$LATEST" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if(Array.isArray(d)&&d.length>0){d.forEach((item,i)=>console.log('   '+(i+1)+'. ['+item.pub_date+'] '+item.source+': '+(item.title||'').slice(0,50)));
    const latest=new Date(d[0].pub_date);const hoursAgo=((Date.now()-latest.getTime())/3600000).toFixed(1);
    console.log('\n   ⏰ 最新内容距现在: '+hoursAgo+' 小时');
    if(hoursAgo>2)console.log('   ⚠️ 内容已超过2小时未更新！');
    }else{console.log('   ❌ 无数据或返回错误: '+JSON.stringify(d).slice(0,100))}" 2>/dev/null; then
    echo ""
  else
    echo "   ❌ Supabase 连接失败或返回异常"
  fi
else
  echo "   ❌ 无法读取 Supabase 凭据"
fi

# 5. 重启 Worker
echo ""
echo "═══ 5. 重启 Worker ═══"
cd "$WORKER_DIR"

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
  echo "   📦 安装依赖..."
  npm install
fi

# 停止旧进程
pm2 delete hashspring-worker 2>/dev/null || true

# 启动新进程
pm2 start index.js --name hashspring-worker \
  --max-memory-restart 512M \
  --restart-delay 5000 \
  --max-restarts 10 \
  --time \
  --log-date-format "YYYY-MM-DD HH:mm:ss"

echo ""
echo "   ⏳ 等待5秒检查启动状态..."
sleep 5

# 6. 验证
echo ""
echo "═══ 6. 验证启动 ═══"
pm2 status
echo ""
echo "   最新日志:"
pm2 logs hashspring-worker --lines 10 --nostream 2>/dev/null

# 7. 保存 PM2 配置（开机自启）
echo ""
echo "═══ 7. 保存 PM2 配置 ═══"
pm2 save
echo "   ✅ PM2 配置已保存"

# 8. 设置 crontab 健康检查（每5分钟）
echo ""
echo "═══ 8. 设置自动健康检查 ═══"
HEALTH_SCRIPT="$HOME/hashspring-next/worker/health-check.sh"
chmod +x "$HEALTH_SCRIPT" 2>/dev/null

# 检查 crontab 是否已有该任务
if crontab -l 2>/dev/null | grep -q "health-check.sh"; then
  echo "   ✅ 健康检查 cron 已存在"
else
  (crontab -l 2>/dev/null; echo "*/5 * * * * bash $HEALTH_SCRIPT >> /tmp/hashspring-health.log 2>&1") | crontab -
  echo "   ✅ 已添加每5分钟健康检查 cron"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ 恢复完成！                                    ║"
echo "║  监控: pm2 logs hashspring-worker                ║"
echo "║  状态: pm2 status                                ║"
echo "╚══════════════════════════════════════════════════╝"
