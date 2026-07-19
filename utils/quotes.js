/**
 * 励志语录库
 * 每日首次登录随机展示一条
 */

const quotes = [
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '中国谚语' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '《警世贤文》' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈' },
  { text: '博观而约取，厚积而薄发。', author: '苏轼' },
  { text: '古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。', author: '苏轼' },
  { text: '志不强者智不达。', author: '墨子' },
  { text: '锲而舍之，朽木不折；锲而不舍，金石可镂。', author: '荀子' },
  { text: '故不积跬步，无以至千里。', author: '荀子' },
  { text: '少壮不努力，老大徒伤悲。', author: '《长歌行》' },
  { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  { text: '温故而知新，可以为师矣。', author: '孔子' },
  { text: '三人行，必有我师焉。', author: '孔子' },
  { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' },
  { text: '生于忧患，死于安乐。', author: '孟子' },
  { text: '天将降大任于是人也，必先苦其心志，劳其筋骨。', author: '孟子' },
  { text: '穷则独善其身，达则兼济天下。', author: '孟子' },
  { text: '吾日三省吾身。', author: '曾子' },
  { text: '世上无难事，只怕有心人。', author: '中国谚语' },
  { text: '只要功夫深，铁杵磨成针。', author: '中国谚语' },
  { text: '冰冻三尺，非一日之寒。', author: '中国谚语' },
  { text: '滴水穿石，非一日之功。', author: '中国谚语' },
  { text: '吃得苦中苦，方为人上人。', author: '中国谚语' },
  { text: '不经一番寒彻骨，怎得梅花扑鼻香。', author: '黄檗禅师' },
  { text: '海纳百川，有容乃大；壁立千仞，无欲则刚。', author: '林则徐' },
  { text: '苟利国家生死以，岂因祸福避趋之。', author: '林则徐' },
  { text: '横眉冷对千夫指，俯首甘为孺子牛。', author: '鲁迅' },
  { text: '时间就像海绵里的水，只要愿挤，总还是有的。', author: '鲁迅' },
  { text: '世上本没有路，走的人多了也便成了路。', author: '鲁迅' },
  { text: '生活就像海洋，只有意志坚强的人才能到达彼岸。', author: '马克思' },
  { text: '天才就是百分之一的灵感加百分之九十九的汗水。', author: '爱迪生' },
  { text: '我思故我在。', author: '笛卡尔' },
  { text: '知识就是力量。', author: '培根' },
  { text: '失败乃成功之母。', author: '中国谚语' },
  { text: '良好的开端是成功的一半。', author: '亚里士多德' },
  { text: '活到老，学到老。', author: '中国谚语' },
  { text: '读万卷书，行万里路。', author: '刘彝' },
  { text: '书山有路勤为径，学海无涯苦作舟。', author: '韩愈' },
  { text: '黑发不知勤学早，白首方悔读书迟。', author: '颜真卿' },
  { text: '莫等闲，白了少年头，空悲切。', author: '岳飞' },
  { text: '有志者事竟成。', author: '《后汉书》' },
  { text: '精诚所至，金石为开。', author: '《后汉书》' },
  { text: '当断不断，反受其乱。', author: '《史记》' },
  { text: '燕雀安知鸿鹄之志哉。', author: '《史记》' },
  { text: '运筹帷幄之中，决胜千里之外。', author: '《史记》' },
  { text: '今天能做的事，绝不拖到明天。', author: '富兰克林' },
  { text: '不要为已消尽之年月叹息，必须正视匆匆溜走的时光。', author: '布莱希特' },
  { text: '你不能把这个世界让给你所鄙视的人。', author: '安·兰德' },
  { text: '做你害怕做的事，害怕自然会消失。', author: '爱默生' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '那些杀不死你的，终将使你更强大。', author: '尼采' },
  { text: '优于别人并不高贵，真正的高贵是优于过去的自己。', author: '海明威' },
  { text: '一个人可以被毁灭，但不能被打败。', author: '海明威' },
  { text: '黑夜给了我黑色的眼睛，我却用它寻找光明。', author: '顾城' },
  { text: '面朝大海，春暖花开。', author: '海子' },
  { text: '既然选择了远方，便只顾风雨兼程。', author: '汪国真' },
  { text: '没有比脚更长的路，没有比人更高的山。', author: '汪国真' },
  { text: '人生没有白走的路，每一步都算数。', author: '李宗盛' },
  { text: '你的气质里，藏着你走过的路、读过的书和爱过的人。', author: '佚名' },
  { text: '所谓万丈深渊，下去也是前程万里。', author: '木心' },
  { text: '岁月不饶人，我亦未曾饶过岁月。', author: '木心' },
  { text: '从前慢，一生只够爱一个人。', author: '木心' },
  { text: '所有的大人都曾经是小孩，虽然只有少数人记得。', author: '圣埃克苏佩里' },
  { text: '重要的东西用眼睛是看不见的。', author: '圣埃克苏佩里' },
  { text: '星星发亮是为了让每一个人有一天都能找到属于自己的星星。', author: '圣埃克苏佩里' },
  { text: '你的时间有限，不要为别人而活。', author: '乔布斯' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: '要有勇气追随你的心灵和直觉。', author: '乔布斯' },
  { text: '不要温和地走进那个良夜。', author: '狄兰·托马斯' },
  { text: '生如夏花之绚烂，死如秋叶之静美。', author: '泰戈尔' },
  { text: '世界以痛吻我，要我报之以歌。', author: '泰戈尔' },
  { text: '当你为错过太阳而哭泣的时候，你也要再错过群星了。', author: '泰戈尔' },
  { text: '把每天当作生命的最后一天来过。', author: '海伦·凯勒' },
  { text: '信心是命运的主宰。', author: '海伦·凯勒' },
  { text: '冬天来了，春天还会远吗？', author: '雪莱' },
  { text: '我来不及认真地年轻，待明白过来时，只能选择认真地老去。', author: '三毛' },
  { text: '梦想，可以天花乱坠；理想，是我们一步一个脚印踩出来的。', author: '三毛' },
  { text: '如果有来生，要做一棵树，站成永恒。', author: '三毛' },
  { text: '人生如逆旅，我亦是行人。', author: '苏轼' },
  { text: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', author: '苏轼' },
  { text: '回首向来萧瑟处，归去，也无风雨也无晴。', author: '苏轼' },
  { text: '但愿人长久，千里共婵娟。', author: '苏轼' },
  { text: '长风破浪会有时，直挂云帆济沧海。', author: '李白' },
  { text: '天生我材必有用，千金散尽还复来。', author: '李白' },
  { text: '会当凌绝顶，一览众山小。', author: '杜甫' },
  { text: '沉舟侧畔千帆过，病树前头万木春。', author: '刘禹锡' },
  { text: '山重水复疑无路，柳暗花明又一村。', author: '陆游' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游' },
  { text: '问渠那得清如许？为有源头活水来。', author: '朱熹' },
  { text: '等闲识得东风面，万紫千红总是春。', author: '朱熹' },
  { text: '落红不是无情物，化作春泥更护花。', author: '龚自珍' },
  { text: '苟日新，日日新，又日新。', author: '《大学》' },
  { text: '满招损，谦受益。', author: '《尚书》' },
  { text: '玉不琢，不成器；人不学，不知道。', author: '《礼记》' },
  { text: '博学之，审问之，慎思之，明辨之，笃行之。', author: '《中庸》' },
  { text: '路遥知马力，日久见人心。', author: '中国谚语' },
  { text: '近朱者赤，近墨者黑。', author: '傅玄' },
  { text: '知人者智，自知者明。', author: '老子' },
  { text: '上善若水，水善利万物而不争。', author: '老子' },
  { text: '道可道，非常道。', author: '老子' },
  { text: '天地不仁，以万物为刍狗。', author: '老子' },
  { text: '一切皆有来处，一切终有归途，我们无从知晓，我们无需害怕，命运自有安排。', author: '佚名' },
  { text: '人生七大幸事：大病初愈、久别重逢、失而复得、虚惊一场、不期而遇、如约而至、未来可期。', author: '佚名' },
  { text: '我们总是会感觉，自己只是衬托红花的一片绿叶，是被大雨淹没的一颗水滴，是烟花背后清冷的黑夜，我们总是羡慕别人故事里的主角，天生自带光环，而我们自己却找不到生活的方向。但我相信，每个人来到世间，都有它存在的意义，绿叶再青，也象征着生命的盛宴，水滴再小，也折射出彩虹的容颜，黑夜再黑，也衬托出烟火的璀璨。既然来了，何不好好地活上一回。我们也许是别人故事里的配角，但至少有一个舞台，我们永远都会站在最中央。人生如戏，每个人都会是主角。', author: '佚名' },
  { text: '丁达尔效应出现的时候，光有了形状，而当你出现时，心动便有了定义，光可以治愈万物，就像有你出现的世界，就是你给我的宇宙级浪漫。', author: '佚名' },
  { text: '所有人都在权衡利弊，都在计较得失，我偏不，我他妈就要真诚，就要热烈，就要迎难而上，我赌那道光穿透我的心脏，我赌世人的枪里没有子弹，这种感觉踏马的好极了！', author: '佚名' },
  { text: '这个爱情故事，好像是个悲剧？你说的是婚姻，爱情没有悲剧。对爱者而言，爱情怎么会是悲剧？对春天而言，秋天是它的悲剧吗？结尾是什么？等待。之后呢？没有之后。或者说，等待的结果呢？等待就是结果。那，不是悲剧吗？不，是秋天。', author: '史铁生' },
  { text: '我常常在想，自己是什么时候开始喜欢你的，有很多答案，但都觉得不够真切。后来我才明白，确认爱的时刻不是你的某句话，某个动作吸引了我，也不是夜里听到一首什么情歌需要代入。而是那一天，人潮拥挤的马路上，绿灯亮起的那一刻，我没有急着往前走，而是举起手机，拍下很漂亮的晚霞，想着如何分享给你。原来爱你，就是从看到你的第一眼起，你就藏在了我生活的每个角落里，很幸运拥抱你的路上没有太多坎坷，世界上哪会有那么多的一见如故和无话不谈，不过是因为我喜欢你啊。所以，请你一定要好好待在我身边。', author: '佚名' },
  { text: '乍一看人生好像是一张答卷，爱让你明白，它可以是自由的画布。', author: '佚名' },
  { text: '爱就是LOVE：Listen聆听，Only唯一，Valued尊重，Excuse宽容。', author: '佚名' },
  { text: '手作之所以珍贵，是因为有人把生命中的一段时光通过物化的形式给了你。', author: '佚名' },
  { text: '因为心中有玫瑰，所以不赏路边花。', author: '佚名' },
  { text: '今年冬天格外冷，庆幸的是，你比冬天先到来。', author: '佚名' },
  { text: '怒不轻言，悦不轻允，悲不轻决，急不择行，惘不择路。', author: '佚名' },
  { text: '我为什么喜欢你呢？我可以举出一千个你的优点，可以列出一万个你让我心动的瞬间，它们就像星星一样遍布在我生命的银河，可我觉得不需要用这些来证明你。因为你是我的月亮，我并不需要太阳，我知道我自己也有光芒，我看到你身上反射出了我的光芒，你便成了我的月亮。而月亮是用来照亮黑夜的，没有你，我自己也可以走下去，但有你，我的世界布满了星星，我有了永远可以想念的月亮。', author: '佚名' },
  { text: '我见众生皆草木，唯独见她是青山。', author: '佚名' },
  { text: '人生之路风雨很多，只要做到力所能及这四个字，就可以心安理得了。', author: '佚名' },
  { text: '当周围没有人吸引你的时候，你就该意识到要往上走了。', author: '佚名' },
  { text: '找到自己热爱与擅长的赛道，活出自己的色彩。', author: '佚名' },
  { text: '榜上无名，不代表脚下无路。', author: '佚名' },
  { text: '鸡涅槃成凤凰并非只靠一代的努力，与其望鸡成凤，不如完善自我。', author: '佚名' },
  { text: 'SMTWTFS——你所浪费的今天，是昨日之人苦苦奢望的明天；你所厌恶的现在，是未来的你再也回不去的曾经。珍惜你所拥有的每一天，才会拥有一个永无遗憾的生命。\nSMTWTFS是周天到周六的英文首字母，意思是过好每一天。', author: '佚名' },
  { text: '早上起床你有两个选择：盖上被子做完你没做完的梦，掀开被子完成你没完成的梦想。', author: '佚名' },
];

/**
 * 获取一条随机语录（一轮内不重复）
 * 使用本地存储 'quote_used_indices' 记录本轮已展示的语录索引
 * 当所有语录展示完毕后自动开启新一轮
 * @returns {{ text: string, author: string, index: number }}
 */
function getRandomQuote() {
  var usedKey = 'quote_used_indices';
  var used = wx.getStorageSync(usedKey) || [];

  // 所有语录已展示一轮，重置
  if (used.length >= quotes.length) {
    used = [];
  }

  // 从未展示的索引中随机选一条
  var available = [];
  for (var i = 0; i < quotes.length; i++) {
    if (used.indexOf(i) < 0) {
      available.push(i);
    }
  }

  var index = available[Math.floor(Math.random() * available.length)];
  used.push(index);
  wx.setStorageSync(usedKey, used);

  return { ...quotes[index], index };
}

/**
 * 获取指定索引的语录
 * @param {number} index
 * @returns {{ text: string, author: string, index: number }}
 */
function getQuoteByIndex(index) {
  const i = ((index % quotes.length) + quotes.length) % quotes.length;
  return { ...quotes[i], index: i };
}

// --- 语录收藏 ---

var FAV_KEY = 'favorite_quote_indices';

/**
 * 获取收藏的语录索引数组
 * @returns {number[]}
 */
function getFavoriteIndices() {
  return wx.getStorageSync(FAV_KEY) || [];
}

/**
 * 添加/移除收藏，返回更新后的索引数组
 * @param {number} index
 * @returns {number[]}
 */
function toggleFavorite(index) {
  var list = wx.getStorageSync(FAV_KEY) || [];
  var pos = list.indexOf(index);
  if (pos >= 0) {
    list.splice(pos, 1);
  } else {
    list.push(index);
  }
  wx.setStorageSync(FAV_KEY, list);
  return list;
}

/**
 * 判断某条语录是否已收藏
 * @param {number} index
 * @returns {boolean}
 */
function isFavorite(index) {
  var list = wx.getStorageSync(FAV_KEY) || [];
  return list.indexOf(index) >= 0;
}

module.exports = {
  quotes: quotes,
  getRandomQuote: getRandomQuote,
  getQuoteByIndex: getQuoteByIndex,
  totalQuotes: quotes.length,
  getFavoriteIndices: getFavoriteIndices,
  toggleFavorite: toggleFavorite,
  isFavorite: isFavorite,
};
