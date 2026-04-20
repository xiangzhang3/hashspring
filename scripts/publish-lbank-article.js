#!/usr/bin/env node
/**
 * 一次性脚本：发布 LBank Pay 文章到 HashSpring
 * 用法：cd ~/hashspring-next && node scripts/publish-lbank-article.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少环境变量，请在 worker/.env 或项目 .env 中配置');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const title_en = 'LBank Pay Expands with Six New Fiat Channels, Launches Exclusive Campaign to Accelerate Crypto Payments';
const title_zh = 'LBank Pay 新增六種法幣通道，推出專屬活動加速加密貨幣支付普及';

const body_en = `<p>LBank, a leading global cryptocurrency exchange, has expanded its LBank Pay ecosystem and rolled out a new user campaign aimed at accelerating real-world cryptocurrency adoption. The update introduces support for six additional fiat currencies: SGD, MNT, KHR, PHP, THB, and LAK, bringing the total number of supported fiat currencies to eight. Simultaneously, LBank continues to deepen its integration with established local payment networks, including VietQR in Vietnam and PIX in Brazil.</p>

<p>This expansion underscores a strategic shift in LBank's development direction. Moving beyond its traditional positioning as a pure trading venue, the platform is evolving into a practical financial access layer that bridges digital assets with everyday spending scenarios. By enabling users to make direct payments with USDT through familiar local payment channels, LBank Pay effectively narrows the gap between holding cryptocurrency and utilizing it in real life.</p>

<p>To support this strategic transition, LBank has launched a limited-time campaign running from April 20 to June 30, 2026 (UTC). During the promotion period, new users who complete a single transaction of at least 3 USDT equivalent via LBank Pay are eligible to receive up to 10 USDT in instant discounts, which will be automatically applied at checkout. The offer is available on a first-come, first-served basis and is currently accessible through the VietQR and PIX payment networks.</p>

<p>The campaign is deliberately designed around low-friction, real-world transactions. Instead of imposing complex trading tasks or requiring significant capital commitments, users can unlock rewards through everyday activities such as purchasing coffee or making small retail purchases. This approach aligns incentive mechanisms with user behavior, encouraging first-time users to experience cryptocurrency as a practical payment method rather than merely a speculative asset.</p>

<p>Eric He, Community Angel Officer and Risk Control Advisor at LBank, commented: "The next phase of crypto adoption will not be driven by trading alone, but by usability. If users can seamlessly spend digital assets in their daily lives, adoption will become a natural outcome rather than a forced transition. LBank Pay is built to eliminate this friction and make cryptocurrency truly practical for everyday use."</p>

<p>The addition of six new fiat currencies further strengthens LBank's presence across Southeast Asia and other emerging markets, where mobile-first financial behaviors are widespread and demand for alternative financial tools continues to grow. By anchoring transactions in stablecoin settlement while integrating local payment channels, LBank effectively connects two parallel financial systems without requiring users to alter their existing payment habits.</p>

<p>As competition among crypto platforms increasingly shifts toward real-world utility, LBank is positioning itself at the forefront of this critical transition. Through the continued expansion of LBank Pay, the platform is not only enhancing its payment capabilities but also redefining its role within the industry — from a traditional trading venue to a broader infrastructure layer that connects digital assets with real-world financial scenarios.</p>

<p>This strategic direction reflects LBank's deep understanding of evolving user needs, as well as a clear long-term view of where the industry is heading. The next phase of crypto growth will be driven less by trading activity and more by real-world usage. Against this backdrop, LBank is focused on building more accessible and practical payment experiences, enabling digital assets to integrate seamlessly into everyday life and accelerating their adoption at scale.</p>`;

const body_zh = `<p>全球領先的加密貨幣交易所 LBank 宣布擴展其 LBank Pay 生態系統，並推出新用戶活動，旨在加速加密貨幣的真實世界應用。此次更新新增支援六種法幣：SGD（新加坡元）、MNT（蒙古圖格里克）、KHR（柬埔寨瑞爾）、PHP（菲律賓比索）、THB（泰銖）和 LAK（寮國基普），使支援的法幣總數增至八種。同時，LBank 持續深化與當地支付網路的整合，包括越南的 VietQR 和巴西的 PIX。</p>

<p>此次擴展凸顯了 LBank 發展方向的策略性轉變。該平台正從傳統的純交易場所定位，演進為連接數位資產與日常消費場景的實用金融基礎設施。透過讓用戶使用 USDT 通過熟悉的本地支付渠道直接付款，LBank Pay 有效縮小了持有加密貨幣與在現實生活中使用之間的差距。</p>

<p>為支持這一策略轉型，LBank 推出了限時活動，活動期間為 2026 年 4 月 20 日至 6 月 30 日（UTC）。在推廣期間，新用戶透過 LBank Pay 完成單筆至少 3 USDT 等值的交易，即有資格獲得最高 10 USDT 的即時折扣，將在結帳時自動套用。此優惠以先到先得方式提供，目前可透過 VietQR 和 PIX 支付網路使用。</p>

<p>該活動特意圍繞低門檻的真實世界交易設計。用戶無需完成複雜的交易任務或投入大量資金，只需透過日常活動（如購買咖啡或小額零售消費）即可解鎖獎勵。這種方式將激勵機制與用戶行為對齊，鼓勵首次用戶將加密貨幣體驗為實用的支付工具，而非僅僅是投機資產。</p>

<p>LBank 社區天使長兼風控顧問 Eric He 表示：「加密貨幣採用的下一階段將不僅僅由交易驅動，更由實用性驅動。如果用戶能在日常生活中無縫使用數位資產，採用將成為自然而然的結果，而非被迫的轉變。LBank Pay 的建設正是為了消除這一摩擦，使加密貨幣真正成為日常實用工具。」</p>

<p>六種新法幣的加入進一步鞏固了 LBank 在東南亞及其他新興市場的佈局，這些地區以行動優先的金融行為為主流，對替代金融工具的需求持續增長。透過以穩定幣結算為核心並整合當地支付渠道，LBank 有效連接了兩個平行的金融體系，而無需用戶改變現有的支付習慣。</p>

<p>隨著加密平台之間的競爭日益轉向現實世界的實用性，LBank 正將自身定位於這一關鍵轉型的前沿。透過持續擴展 LBank Pay，該平台不僅在強化其支付能力，更在重新定義其行業角色——從傳統的交易場所轉型為連接數位資產與真實金融場景的更廣泛基礎設施層。</p>

<p>這一策略方向反映了 LBank 對不斷演變的用戶需求的深刻理解，以及對行業走向的清晰長遠見解。加密貨幣增長的下一階段將更少由交易活動驅動，更多由現實世界的使用驅動。在此背景下，LBank 專注於構建更便捷、更實用的支付體驗，使數位資產能無縫融入日常生活，並加速其大規模採用。</p>`;

const slug = 'lbank-pay-expands-with-six-new-fiat-channels-launches-exclusive-campaign';
const sourceUrl = 'https://cryptopotato.com/lbank-pay-expands-with-six-new-fiat-channels-launches-exclusive-campaign-to-accelerate-crypto-payments/';

async function publish() {
  console.log('📝 发布 LBank Pay 文章...\n');

  // 1. 写入 articles 表
  const { data: artData, error: artErr } = await supabase
    .from('articles')
    .upsert({
      slug,
      title: title_en,
      title_en,
      excerpt: 'LBank 擴展 LBank Pay 生態，新增六種法幣（SGD、MNT、KHR、PHP、THB、LAK），並推出新用戶最高 10 USDT 即時折扣活動，深化與 VietQR 和 PIX 支付網路的整合。',
      excerpt_en: 'LBank expands LBank Pay with six new fiat currencies (SGD, MNT, KHR, PHP, THB, LAK) and launches a campaign offering up to 10 USDT in instant discounts for new users, deepening VietQR and PIX integration.',
      content: body_zh,
      content_en: body_en,
      content_html: body_zh,
      content_html_en: body_en,
      category: 'analysis',
      author: 'CryptoPotato / Chainwire',
      tags: ['LBank', 'Crypto Payments', 'Stablecoin', 'USDT', 'Southeast Asia'],
      locale: 'en',
      source: 'CryptoPotato',
      source_url: sourceUrl,
      published_at: '2026-04-20T08:09:00.000Z',
      read_time: 4,
      views: 0,
      is_featured: true,
      is_published: true,
    }, { onConflict: 'slug' });

  if (artErr) {
    console.error('❌ Article 写入失败:', artErr.message);
  } else {
    console.log('✅ Article 写入成功');
    console.log(`   URL: https://www.hashspring.com/en/analysis/${slug}`);
    console.log(`   URL: https://www.hashspring.com/zh/analysis/${slug}`);
  }

  // 2. 写入 flash_news 表
  const contentHash = 'h' + Math.abs(Array.from(title_en).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)).toString(36);

  const { error: flashErr } = await supabase
    .from('flash_news')
    .upsert({
      content_hash: contentHash,
      title: title_en,
      title_en,
      title_zh,
      description: 'LBank expands LBank Pay with six new fiat currencies (SGD, MNT, KHR, PHP, THB, LAK) and launches a campaign offering up to 10 USDT in instant discounts.',
      body_en: body_en.replace(/<\/?p>/g, '\n\n').trim(),
      body_zh: body_zh.replace(/<\/?p>/g, '\n\n').trim(),
      link: sourceUrl,
      source: 'CryptoPotato',
      source_type: 'manual',
      category: 'Crypto',
      level: 'orange',
      pub_date: '2026-04-20T08:09:00.000Z',
      lang: 'en',
      analysis: 'LBank Pay is expanding beyond trading into real-world crypto payments, targeting Southeast Asian markets with local payment integration. The limited-time campaign (Apr 20 - Jun 30) aims to onboard new users through low-friction everyday transactions.',
    }, { onConflict: 'content_hash', ignoreDuplicates: true });

  if (flashErr) {
    console.error('❌ Flash news 写入失败:', flashErr.message);
  } else {
    console.log('✅ Flash news 写入成功');
  }

  // 3. IndexNow 通知
  try {
    const urls = [
      `https://www.hashspring.com/en/analysis/${slug}`,
      `https://www.hashspring.com/zh/analysis/${slug}`,
    ];
    const inRes = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'www.hashspring.com',
        key: 'hashspring2026indexnow',
        keyLocation: 'https://www.hashspring.com/hashspring2026indexnow.txt',
        urlList: urls,
      }),
    });
    console.log(`✅ IndexNow 通知: ${inRes.status} (${urls.length} URLs)`);
  } catch (e) {
    console.warn('⚠️ IndexNow 通知失败:', e.message);
  }

  console.log('\n🎉 发布完成！');
}

publish().catch(console.error);
