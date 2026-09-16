export const KNOWLEDGE_CATEGORIES = [
  { code: "SW", name: "软件问题", sort: 1 },
  { code: "NET", name: "网络问题", sort: 2 },
  { code: "HW", name: "硬件常识", sort: 3 },
  { code: "BASIC", name: "基础常识", sort: 4 },
];

export const KNOWLEDGE_ARTICLES: {
  code: string;
  cat: string;
  title: string;
  symptoms: string;
  solution: string;
  tags: string;
  relatedCategoryCode?: string;
  relatedSkuCode?: string;
  sort: number;
}[] = [
  {
    code: "SW-REINSTALL",
    cat: "SW",
    title: "重装 Windows：备份、U 盘、激活",
    symptoms: "系统巨卡、病毒清不掉、升级失败循环、客户要求重装。",
    solution:
      "1. 先问清要不要保留桌面/微信/浏览器书签，能拷就拷到移动盘。\n2. 用微软官网 Media Creation Tool 做 U 盘，避免来路不明的 Ghost 包。\n3. 笔记本先确认有无 RAID/RST，否则安装程序看不到硬盘。\n4. 装完：主板/芯片组/显卡/网卡驱动，再装办公和杀毒。\n5. 激活用客户自己的密钥或数字权利，不要用来路不明激活工具。\n6. 装完让客户自己登一次微信/邮箱，确认能开机再交机。",
    tags: "重装,系统,U盘,激活",
    relatedCategoryCode: "SVC",
    sort: 10,
  },
  {
    code: "SW-BSOD",
    cat: "SW",
    title: "蓝屏：先记代码再换件",
    symptoms: "蓝屏重启、MEMORY_MANAGEMENT、IRQL、VIDEO_TDR、WHEA。",
    solution:
      "1. 拍照记下 STOP 代码和出错文件。\n2. 最近加过内存/SSD/显卡，先拔回原配置试。\n3. MEMORY_ 类：内存插一根试、换槽、关 XMP。\n4. VIDEO_TDR：更显卡驱动或卸独显试核显。\n5. WHEA/CPU：降温、换电源、查主板供电。\n6. 能进安全模式再卸驱动；进不去再考虑硬盘/重装。",
    tags: "蓝屏,死机,驱动",
    relatedCategoryCode: "PC-RAM",
    sort: 20,
  },
  {
    code: "SW-SLOW",
    cat: "SW",
    title: "开机慢、卡顿：先分清硬盘还是软件",
    symptoms: "开机几分钟、点一下转圈、浏览器卡。",
    solution:
      "1. 任务管理器看磁盘是否长期 100%：老机械盘优先加/换 SSD。\n2. 开机启动项关掉国产套件、游戏平台。\n3. 查是否矿工/弹窗，必要时离线杀毒或重装。\n4. 内存小于 8G 的 Win11 会明显卡，建议升到 16G。\n5. 笔记本插电与电池模式性能差很多，先插电试。",
    tags: "卡顿,开机慢,SSD",
    relatedCategoryCode: "PC-SSD",
    sort: 30,
  },
  {
    code: "SW-DRIVER",
    cat: "SW",
    title: "驱动装错、设备管理器黄叹号",
    symptoms: "没声音、分辨率低、网卡不见、叹号。",
    solution:
      "1. 先认准芯片：Intel/AMD 核显、NVIDIA/AMD 独显，别下错。\n2. 用驱动精灵一类全家桶容易装串，优先官网或主板型号页。\n3. 网卡没了：先装芯片组/LAN，再装无线。\n4. 声卡没了：Realtek 控制面板 + 前方面板 HD Audio 针脚。\n5. 装完重启，再看设备管理器是否还黄。",
    tags: "驱动,叹号,声卡,显卡",
    relatedCategoryCode: "PC-MB",
    sort: 40,
  },
  {
    code: "SW-OFFICE",
    cat: "SW",
    title: "Office 打不开、提示未授权",
    symptoms: "Word 一开就关、提示许可、WPS 和 Office 打架。",
    solution:
      "1. 先卸载再装一个：Office 与 WPS 尽量别叠两套完整版。\n2. 用微软官方安装，登录客户微软账户激活。\n3. 提示被管理员阻止：查组策略/杀毒隔离。\n4. 文件打不开先试「打开并修复」，再换电脑试是否文件坏。",
    tags: "Office,WPS,激活",
    sort: 50,
  },
  {
    code: "SW-PRINTER",
    cat: "SW",
    title: "打印机脱机、打不出来",
    symptoms: "脱机、队列卡住、电脑能看到打印机但没反应。",
    solution:
      "1. 打印机本身能否打测试页，分清是机器坏还是电脑问题。\n2. 取消脱机、清打印队列、重启 Print Spooler。\n3. USB 换口换线；网络机看 IP 是否变了，重新添加 TCP/IP 端口。\n4. 驱动用型号对应的，Win11 不要硬装 Win7 包。\n5. 共享打印：关客户电脑休眠，检查工作组/权限。\n\n![激光机走纸](/knowledge/printer-paper-path.svg)\n卡纸先看进纸口、定影组件、出纸口三处，不要硬拽。",
    tags: "打印机,脱机,共享",
    relatedCategoryCode: "PRT",
    sort: 60,
  },
  {
    code: "HW-PRINTER",
    cat: "HW",
    title: "打印机：卡纸、报硒鼓、打白页",
    symptoms: "卡纸、缺粉、白页、有竖纹、网络机掉线。",
    solution:
      "1. 先打机内测试页：能打是电脑/驱动，不能打是机器或耗材。\n2. 卡纸：断电后按走纸路径取纸，别撕一半留在定影辊。\n3. 报硒鼓/粉盒：认准型号（如 303、012），兼容粉先摇匀再装，芯片接触不良会一直报空。\n4. 白页或淡：密封条没撕、粉用尽、激光器被挡。\n5. 网络机：固定 IP 写进客户资料，DHCP 一变端口就失效。\n\n![走纸示意](/knowledge/printer-paper-path.svg)\n\n可对照目录里的机型图：\n\n![常见激光机](/product-images/PRT-L3251.svg)",
    tags: "打印机,卡纸,硒鼓,网络打印",
    relatedCategoryCode: "PRT",
    relatedSkuCode: "PRT-L3251",
    sort: 80,
  },
  {
    code: "NET-L3",
    cat: "NET",
    title: "三层交换机：VLAN、网关、上不了网",
    symptoms: "电脑能拿到地址但出不去、跨 VLAN 不通、管理地址 ping 不通。",
    solution:
      "1. 先分清二层隔离和三层转发：同一 VLAN 不通查线/口/VLAN；不同 VLAN 不通查三层网关和路由。\n2. 每个 VLAN 要有 SVI（如 vlanif 10 的 IP），电脑网关填这个地址，不要填错成光猫。\n3. 上联口一般做 trunk，允许业务 VLAN；下联电脑口做 access。\n4. 默认路由指向出口防火墙/路由器；没有 0.0.0.0/0 就只能内网互访。\n5. 管理 VLAN 单独划，别跟访客同一网段。配置前先从客户资料抄现网 IP。\n\n![三层转发](/knowledge/switch-3layer.svg)\n\n![地址规划](/knowledge/ip-segments.svg)",
    tags: "交换机,VLAN,三层,网关",
    relatedCategoryCode: "NET",
    sort: 60,
  },
  {
    code: "SW-WECHAT",
    cat: "SW",
    title: "重装后微信/QQ 聊天记录没了",
    symptoms: "客户说聊天记录全没，非常急。",
    solution:
      "1. 重装前必须备份：微信 PC 版「备份与恢复」，或拷 WeChat Files 目录。\n2. 已经重装：问有没有旧盘、旧用户目录、手机端能否迁回。\n3. 换电脑登录不等于记录自动来，要主动迁移。\n4. 店里话术：重装前书面确认「不备份则记录无法恢复」。",
    tags: "微信,备份,重装",
    sort: 70,
  },
  {
    code: "NET-NONE",
    cat: "NET",
    title: "电脑显示未识别网络 / 无 Internet",
    symptoms: "托盘地球图标、能连 Wi-Fi 但打不开网页、IP 169.254。",
    solution:
      "1. 先试手机热点，能上网就是原网络问题。\n2. 有线：换线换口，看网卡灯。设备管理器网卡是否禁用。\n3. ipconfig：169.254 是没拿到 DHCP，查路由器或设手动 IP。\n4. DNS 可先试 223.5.5.5 / 8.8.8.8。\n5. 重置 Winsock / 网络堆栈前先记现有 IP。\n6. 光猫桥接+路由：别两个设备同时开 DHCP。",
    tags: "没网,DHCP,DNS",
    relatedCategoryCode: "NET",
    sort: 10,
  },
  {
    code: "NET-WIFI",
    cat: "NET",
    title: "Wi-Fi 能搜到连不上或反复掉",
    symptoms: "密码对但连不上、只有 2.4G、掉线。",
    solution:
      "1. 忘记网络再连，确认是不是 5G 名称客户记错。\n2. 笔记本无线开关、飞行模式、驱动。\n3. 路由器信道拥挤可改信道；老网卡可能不支持 Wi-Fi 6。\n4. MAC 过滤、黑名单、连接数满。\n5. 距离远或隔墙：加 AP 或网线，不要只加劣质放大器。",
    tags: "WiFi,掉线,无线",
    relatedCategoryCode: "NET",
    sort: 20,
  },
  {
    code: "NET-CABLE",
    cat: "NET",
    title: "网线、水晶头、面板无链路",
    symptoms: "插上没灯、时好时坏、百兆跑不满。",
    solution:
      "1. 网卡灯不亮：换已知好线，排除电脑口。\n2. 测线仪看 1-8 是否全通，568B 两端一致。\n3. 劣质超五类、死折、门缝压线会导致掉速掉线。\n4. 超过 90 米或劣质 POE 监控线会供电不稳。\n5. 面板模块压接顺序错误等于没做。",
    tags: "网线,水晶头,POE",
    relatedCategoryCode: "CCTV-CABLE",
    sort: 30,
  },
  {
    code: "NET-IP",
    cat: "NET",
    title: "IP 冲突、打印机/监控抢地址",
    symptoms: "提示 IP 冲突、某台电脑偶发掉线、摄像头时隐时现。",
    solution:
      "1. 路由器 DHCP 范围不要和手动 IP 重叠，预留静态段。\n2. 监控、打印机、NAS 用固定 IP 并写标签。\n3. 两台路由都开 DHCP 是通病，下级改桥接或关 DHCP。\n4. 改完让客户重启一次光猫和路由。",
    tags: "IP冲突,DHCP,监控",
    relatedCategoryCode: "CCTV",
    sort: 40,
  },
  {
    code: "NET-SLOW",
    cat: "NET",
    title: "网速慢：先测本机再怪宽带",
    symptoms: "客户说宽带不行，其实是 Wi-Fi 或中毒。",
    solution:
      "1. 网线直连光猫/路由测速，对比 Wi-Fi。\n2. 单机跑满、多机卡：查带宽和是否有人下载。\n3. 浏览器劫持、无意义代理、VPN 残留。\n4. 百兆网卡+千兆宽带会卡在 100M，查网线和协商速率。\n5. 监控和电脑同一路由：大码流会占满上行。",
    tags: "网速,测速,百兆",
    sort: 50,
  },
  {
    code: "HW-NOSIGNAL",
    cat: "HW",
    title: "开机无显示（黑屏有电）",
    symptoms: "风扇转、灯亮、显示器无信号、主板灯停在 CPU/DRAM。",
    solution:
      "1. 显示器线插独显还是主板，有独显应插显卡口。\n2. 拆到最小系统：CPU+一块内存+核显/独显+电源。\n3. 内存金手指、换槽、一根一根试。\n4. 主板 Q 灯：CPU 灯查扣具/针脚；DRAM 灯查内存；VGA 灯查显卡供电。\n5. 短路开机键、清 CMOS。\n6. 别一上来就判 CPU 报废，先排除电源和内存。",
    tags: "黑屏,点不亮,内存",
    relatedCategoryCode: "PC-MB",
    sort: 10,
  },
  {
    code: "HW-RAM",
    cat: "HW",
    title: "内存不兼容、对不了 XMP",
    symptoms: "开机反复重启、进系统蓝屏、XMP 一开就挂。",
    solution:
      "1. 同色槽位插双通道，优先 A2/B2。\n2. 混条（不同频率/品牌）先降频或关 XMP。\n3. 12/13/14 代 DDR4 板对杂条较挑，换官方 QVL 或一套新条。\n4. 金手指氧化用橡皮清洁，别涂酒精乱擦PCB。",
    tags: "内存,XMP,蓝屏",
    relatedCategoryCode: "PC-RAM",
    relatedSkuCode: "RAM16",
    sort: 20,
  },
  {
    code: "HW-CPU-COOL",
    cat: "HW",
    title: "CPU 温度高、过热关机",
    symptoms: "打游戏烫、突然断电、烤机 90℃+。",
    solution:
      "1. 看风扇转不转、扣具是否压实、硅脂是否干。\n2. 原装风扇带不动 65W 以上 K/X 系列，要换塔式或水冷。\n3. 机箱进风出风反了会积热。\n4. 笔记本：清灰换硅脂，别只吹外表。\n5. 限温不一定是 CPU 坏，先排除散热再谈换 U。",
    tags: "温度,硅脂,风扇",
    relatedCategoryCode: "PC-COOL",
    relatedSkuCode: "CPU-I5",
    sort: 30,
  },
  {
    code: "HW-PSU",
    cat: "HW",
    title: "电源功率不够、开机跳闸或重启",
    symptoms: "显卡一起游戏就重启、电源异响、烧接口。",
    solution:
      "1. 按显卡建议功率留余量，别拿 400W 杂牌带 4070。\n2. 独显必须接 PCIe 供电线，不能只插主板。\n3. 转接一条顶两条 8pin 的线材风险大。\n4. 跳闸先查客户家线路和插排，再查电源。\n5. 更换电源要确认 24pin/CPU 8pin/显卡供电都到位。",
    tags: "电源,重启,显卡",
    relatedCategoryCode: "PC-PSU",
    sort: 40,
  },
  {
    code: "HW-DISK",
    cat: "HW",
    title: "硬盘/SSD 认不到",
    symptoms: "重装看不到盘、磁盘管理没有、NVMe 没位。",
    solution:
      "1. SATA 线/供电换一套；AHCI 不要误开 RAID。\n2. NVMe：主板 M.2 口是否和 SATA 口共享，插错口会吞盘。\n3. BIOS 里开 CSM/关闭 Secure Boot 与否按系统需求。\n4. 老 H61/B75 没有 M.2，需要转接或换板。\n5. 能认盘但 0 容量：芯片坏，勿格式化当修好。",
    tags: "硬盘,NVMe,M.2",
    relatedCategoryCode: "PC-SSD",
    relatedSkuCode: "SSD1T",
    sort: 50,
  },
  {
    code: "HW-GPU",
    cat: "HW",
    title: "独显不输出、驱动装完黑屏",
    symptoms: "核显有画面独显没有、装驱动后黑屏。",
    solution:
      "1. 线插在显卡上，显示器输入源选对 HDMI/DP。\n2. 显卡供电插头插牢，8pin 别松。\n3. 卸驱动用 DDU 安全模式，再装对应系列。\n4. 矿卡/二手卡查是否锁算力、假卡。\n5. 笔记本独显不亮多为内部排线或切换，不是桌面经验能套。",
    tags: "显卡,HDMI,驱动",
    relatedCategoryCode: "PC-GPU",
    relatedSkuCode: "GPU-4060",
    sort: 60,
  },
  {
    code: "HW-SOCKET",
    cat: "HW",
    title: "接口认错：775 到 1851、AM4/AM5",
    symptoms: "客户拿来 U 和板对不上，或强按弯针。",
    solution:
      "1. 先认针脚：Intel LGA 看底板接口丝印；AMD AM4 有针 AM5 无针。\n2. 12–14 代 LGA1700 可同板；Ultra 200 是 LGA1851，不能互插。\n3. AM4 锐龙可刷 BIOS 升 5000；AM5 必须 DDR5 板。\n4. 装 U 对齐三角标，均匀扣紧，禁止斜着硬压。\n5. 弯针尽量专业修，不要用美工刀挑。",
    tags: "接口,CPU,主板",
    relatedCategoryCode: "PC-CPU",
    sort: 70,
  },
  {
    code: "BASIC-WARRANTY",
    cat: "BASIC",
    title: "保修怎么看：盒装、散片、店保、品牌保",
    symptoms: "客户拿散片来要三年，或过保说还能换。",
    solution:
      "1. 英特尔/AMD 盒装走序列号官网查；散片一般没有原厂保，店里按约定店保。\n2. 主板显卡看序列号和购机凭证，水货渠道可能无保。\n3. 销售保修从销售日起算，进货保修从入库日起算，两套别混。\n4. 人为损坏、烧供电、拆保贴按约定不保。\n5. SN 能查清是谁卖出，先查本系统再扯皮。",
    tags: "保修,散片,盒装,SN",
    relatedCategoryCode: "PC-CPU",
    sort: 10,
  },
  {
    code: "BASIC-BACKUP",
    cat: "BASIC",
    title: "收机必问：密码、备份、有没有重要资料",
    symptoms: "修好了进不去、资料没了起纠纷。",
    solution:
      "1. 开机密码、微软账户、PIN、硬盘 BitLocker 密钥。\n2. 重装/换盘前书面确认备份责任。\n3. 监控/公司电脑问清能不能格式化。\n4. 报价单上写清「不包含数据恢复」。",
    tags: "收机,备份,密码",
    sort: 20,
  },
  {
    code: "BASIC-STATIC",
    cat: "BASIC",
    title: "装机防静电、拧螺丝、走线",
    symptoms: "装完点不亮、螺丝滑牙、线挡风扇。",
    solution:
      "1. 断电、电源开关拨 0，按开机键放电。\n2. 主板铜柱缺一颗会短路，多一颗也危险。\n3. CPU 扣具一次到位，硅脂米粒大小即可。\n4. 24pin、CPU 供电、前方面板线按手册，HD Audio 别插 USB。\n5. 交机前通电进 BIOS 看温度和盘。",
    tags: "装机,静电,螺丝",
    relatedCategoryCode: "PC-CASE",
    sort: 30,
  },
  {
    code: "BASIC-VIRUS",
    cat: "BASIC",
    title: "中招：主页被劫持、弹广告、矿",
    symptoms: "浏览器乱跳、风扇狂转、任务管理器有奇怪进程。",
    solution:
      "1. 先看 CPU 占用，矿工会满载。\n2. 卸载来路不明加速器/播放器，清启动项。\n3. 改浏览器快捷方式目标，去掉后面的网址。\n4. 清不干净就重装，比跟木马耗半天便宜。\n5. 教客户不要下「破解版 Office」。",
    tags: "病毒,广告,矿",
    sort: 40,
  },
  {
    code: "BASIC-QUOTE",
    cat: "BASIC",
    title: "报价话术：检测费、修不好、换件差价",
    symptoms: "客户觉得看一眼就该免费，或修不好要全退。",
    solution:
      "1. 进店先说检测是否收费、多久出结论。\n2. 换件用本系统商品目录给型号，避免口头「一样的内存」。\n3. 散片/二手写明店保时长。\n4. 数据不保证，工程走合同。\n5. 谈妥再拆机，避免拆完不修的扯皮。",
    tags: "报价,检测费,话术",
    sort: 50,
  },
];
