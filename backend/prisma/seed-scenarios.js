/**
 * Prisma 种子脚本：插入 6 个预置演练场景。
 * 用途：开发/演示环境首次部署后跑一次，让演练场有可选场景。
 * 幂等：场景按 title 去重，已存在则跳过。
 * 运行：node prisma/seed-scenarios.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** 6 个覆盖常见销售场景的预置数据 */
const PRESET_SCENARIOS = [
  {
    title: '价格异议处理',
    description:
      '客户认为产品价格偏贵，希望砍价或对比竞品。练习用价值话术、捆绑优惠、分期方案等多种角度化解价格异议。',
    type: 'NEGOTIATION',
    setting: {
      customerProfile: '中型企业采购负责人，预算谨慎，已对比 2-3 家供应商',
      mainObjection: '价格比竞品贵 20%',
      successCriteria: '不直接降价，用价值/服务/案例支撑当前报价',
    },
  },
  {
    title: '陌生客户冷启动开场',
    description:
      '面对完全陌生的潜在客户首次接触。练习 30 秒内引起兴趣、建立信任、约定下一步行动的开场话术。',
    type: 'COLD_CALL',
    setting: {
      customerProfile: '行业目录里筛出的潜在客户，从未接触过我们',
      mainObjection: '我很忙，没有需求',
      successCriteria: '60 秒内说清楚来意 + 约定后续沟通时间',
    },
  },
  {
    title: '产品功能深度演示',
    description:
      '客户已表达兴趣，需要进行 15 分钟产品 Demo。练习突出客户核心痛点对应的功能、控制节奏、引导提问。',
    type: 'PRODUCT_DEMO',
    setting: {
      customerProfile: '已完成需求沟通的意向客户，技术决策人在场',
      mainObjection: '功能听起来都差不多，差异化在哪里',
      successCriteria: '用 3 个核心场景演示打动客户，约定 POC 试用',
    },
  },
  {
    title: '竞品对比攻防',
    description:
      '客户拿出主要竞品的方案要求对比。练习既不贬低对手又能客观说出我方差异化优势的话术。',
    type: 'COMPETITOR',
    setting: {
      customerProfile: '正在对比 3 家供应商的最终决策人',
      mainObjection: '某竞品的功能/价格/服务看起来更好',
      successCriteria: '客观对比，用案例+ROI 数据建立我方优势认知',
    },
  },
  {
    title: '续费谈判',
    description:
      '老客户合约到期前 30 天，提出降价或取消续费。练习用使用数据、增量价值、长期方案挽回客户。',
    type: 'NEGOTIATION',
    setting: {
      customerProfile: '续费在即的老客户，决策人对成本敏感',
      mainObjection: '今年预算砍 30%，要么降价要么不续了',
      successCriteria: '用数据证明 ROI，提供等价值的替代方案保住续费',
    },
  },
  {
    title: '客户投诉安抚',
    description:
      '老客户遇到产品问题情绪激动地投诉。练习先共情、再说明、最后给方案的标准三步法。',
    type: 'CUSTOM',
    setting: {
      customerProfile: '使用 1 年的老客户，遇到严重 bug 影响业务',
      mainObjection: '产品不行，要求退款赔偿',
      successCriteria: '先安抚情绪 → 说明原因 → 给出补偿+预防方案',
    },
  },
];

async function main() {
  console.log('开始种子化演练场景...');
  let created = 0;
  let skipped = 0;

  for (const item of PRESET_SCENARIOS) {
    // 用 title 做幂等键：已存在则跳过，避免重复插入
    const existing = await prisma.scenario.findFirst({
      where: { title: item.title, isPreset: true },
    });

    if (existing) {
      console.log(`  [跳过] 已存在: ${item.title}`);
      skipped += 1;
      continue;
    }

    await prisma.scenario.create({
      data: {
        title: item.title,
        description: item.description,
        type: item.type,
        setting: item.setting,
        isPreset: true,
        teamId: null,
      },
    });
    console.log(`  [新建] ${item.title}`);
    created += 1;
  }

  console.log(`\n完成：新建 ${created} 个，跳过 ${skipped} 个，合计 ${PRESET_SCENARIOS.length} 个预置场景。`);
}

main()
  .catch((e) => {
    console.error('种子失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
