export interface PoetrySeed {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  annotation: string | null;
  appreciation: string | null;
  sourceVersion: string;
  sourceUrl: string;
  dataChecksum: string;
  licenseTag: string;
}

const SOURCE_URL = 'https://github.com/chinese-poetry/chinese-poetry';
const SOURCE_VERSION = 'seed-mvp-2026-03-27';
const DATA_CHECKSUM = 'seed-mvp-2026-03-27';
const LICENSE_TAG = 'manual-curation-for-mvp';

export const SEEDED_POEMS: readonly PoetrySeed[] = [
  {
    id: 'poem-jing-ye-si',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    content: '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
    annotation: '这首五言绝句以月色起兴，用最浅白的语言写出游子夜半望月时的乡愁。',
    appreciation:
      '全诗几乎没有生僻字，却把“望月即思乡”的情感压缩得极其凝练。前两句写景，后两句转入动作与心理，形成由外到内的自然过渡。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-chun-xiao',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    content: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    annotation: '诗人从醒来后的听觉切入，借风雨与落花写出春日清晨的轻柔与惋惜。',
    appreciation:
      '“不觉晓”写出春睡的酣足，“花落知多少”则把读者带回昨夜风雨的想象里，短短二十字就让春景与春情同时成立。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-deng-guan-que-lou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    content: '白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。',
    annotation: '前两句铺开辽阔景象，后两句由景入理，点出“登高方能望远”的人生意味。',
    appreciation:
      '这首诗把空间推进和精神提升写在了一起。最后一句几乎成了中文世界里最经典的进取隐喻，适合做每日卡片里的提气时刻。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-xiang-si',
    title: '相思',
    author: '王维',
    dynasty: '唐',
    content: '红豆生南国，\n春来发几枝。\n愿君多采撷，\n此物最相思。',
    annotation: '红豆在古典语境中常被视作相思之物，整首诗借物写情，清婉含蓄。',
    appreciation:
      '王维把抽象情感压进一个轻巧意象里，既有赠人之意，也有不直说的深情。短句与反复的“相思”让诗意非常适合被卡片化呈现。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-jiang-xue',
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    content: '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。',
    annotation: '极端空寂的雪江景象中，诗人只留下一个“独钓”的老翁，使画面苍茫而有力度。',
    appreciation:
      '前两句把环境写到极静极寒，后两句再把人物安放进去，形成强烈反差。读起来像一幅留白很多的山水画，很适合做视觉化展示。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-ti-xi-lin-bi',
    title: '题西林壁',
    author: '苏轼',
    dynasty: '宋',
    content: '横看成岭侧成峰，\n远近高低各不同。\n不识庐山真面目，\n只缘身在此山中。',
    annotation: '苏轼借游山所见，写出观察位置不同就会得到不同结论的道理。',
    appreciation:
      '这首诗既能当写景诗，也能当思辨短文。它天然适合产品中的“今日一首”场景，因为读者很容易把它联想到决策、协作与视角问题。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
  {
    id: 'poem-que-qiao-xian',
    title: '鹊桥仙·纤云弄巧',
    author: '秦观',
    dynasty: '宋',
    content:
      '纤云弄巧，飞星传恨，银汉迢迢暗度。\n金风玉露一相逢，便胜却、人间无数。\n柔情似水，佳期如梦，忍顾鹊桥归路。\n两情若是久长时，又岂在、朝朝暮暮。',
    annotation: '这首词写牛郎织女相会，以浪漫想象写久别后的重逢，也提出了超越朝夕相守的爱情理解。',
    appreciation:
      '秦观把神话写得极柔软，尤其结尾两句极具传唱度。它和前面的短绝句风格不同，能让每日卡片的内容节奏更有变化。',
    sourceVersion: SOURCE_VERSION,
    sourceUrl: SOURCE_URL,
    dataChecksum: DATA_CHECKSUM,
    licenseTag: LICENSE_TAG,
  },
];
