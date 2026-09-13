# Novel UI Agent 须知

本文可直接作为 AI Agent 的系统提示词、项目知识或输出规范使用。Novel UI Renderer 只读取结构化数据，不执行 JavaScript，也不会调用任何模型 API。

## 一、强制输出规则

1. 只有需要模拟聊天、社交页面、论坛、报告、票证或证件时才输出 Novel UI；普通叙事继续使用普通文本。
2. 推荐使用 `[[novel-ui]]` 与 `[[/novel-ui]]` 包裹一个完整 JSON 对象。
3. 标记和 JSON **不得放进 Markdown 代码块**，不要添加 `json`、反引号或解释文字到标记内部。
4. 每个区块必须包含：`schema`、`version`、`component`、`variant`、`props`。
5. 固定使用 `"schema":"novel-ui"` 和 `"version":"1.0"`。
6. JSON 必须严格合法：使用双引号、不得有注释、不得有尾随逗号、不得输出 `undefined`。
7. 一个回答可以包含多个 Novel UI 区块，区块之间可以穿插小说正文。
8. 必须等 JSON 完整后再输出结束标记。不要输出半截区块。
9. 不要编造未支持的 `component:variant`。可选键只能使用本文列出的 14 种。
10. 所有内容仅作为虚构小说道具。票号、证件号、机构和运营方优先使用虚构信息，避免复制真实品牌标识。
11. 不要在字段中输出 HTML、CSS、JavaScript、事件属性或脚本。正文只填纯文本。
12. 图片 URL 仅在 X 帖子/通知的 `avatar` 或媒体 `url` 字段中可用，且只能使用 `http`/`https`。没有可靠 URL 时省略，Renderer 会显示占位内容。

标准外壳：

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"组件名","variant":"样式名","props":{}}
    [[/novel-ui]]

兼容旧语法：`:::novel-ui` 开始、`:::` 结束。新内容应优先使用方括号语法，因为更不容易被模型或 Markdown 改写。

## 二、使用方式

将本文提供给 AI 后，可这样下达任务：

> 在小说正文中正常叙事。出现聊天、帖子、报告或票证时，按照 Novel UI Agent 须知选择对应组件，并输出完整的 `[[novel-ui]]` 区块。区块不要放进 Markdown 代码块。人物、时间、地点和事件必须与当前剧情一致。

选择规则：

| 场景 | `component:variant` |
|---|---|
| Kakao 风格对话 | `chat:kakao` |
| 医疗检查报告 | `document:medical` |
| 单条 X 帖子 | `social:x-post` |
| X 信息流 | `social:x-feed` |
| X 通知页 | `social:x-notifications` |
| X 趋势页 | `social:x-trends` |
| theqoo 韩国论坛 | `article:theqoo` |
| 微博帖子 | `social:weibo-post` |
| 飞机票 | `ticket:flight` |
| 船票 | `ticket:ferry` |
| 高铁/火车票 | `ticket:rail` |
| 巴士票 | `ticket:bus` |
| 虚构身份证 | `document:identity-card` |
| 工作牌 | `document:work-card` |

## 三、字段与示例

### 1. Kakao 聊天 `chat:kakao`

必填：`title`、`messages`。每条消息必填 `id`、`sender`、`side`、`text`；`side` 只能是 `left` 或 `right`。可选：`date`、`name`、`time`、`read`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"chat","variant":"kakao","props":{"title":"凑崎纱夏","date":"2026-09-13","messages":[{"id":"m1","sender":"sana","name":"凑崎纱夏","side":"left","text":"你在哪里？","time":"23:41","read":null},{"id":"m2","sender":"yihyun","name":"徐以炫","side":"right","text":"医院。","time":"23:43","read":1}]}}
    [[/novel-ui]]

### 2. 医疗报告 `document:medical`

必填：`hospital`、`department`、`patient`、`reportTitle`、`fields`、`findings`。`fields` 每项必须有 `label`、`value`，长字段可设置 `wide:true`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"document","variant":"medical","props":{"hospital":"Seoul National University Hospital","department":"Thoracic Surgery","patient":"徐以炫","reportTitle":"CT Examination Report","fields":[{"label":"Date","value":"2026-09-13"},{"label":"Examination","value":"Chest CT Plain Scan"},{"label":"Clinical History","value":"Previous left thoracic trauma and surgery, chronic recurrent pain","wide":true}],"findings":"左肺下叶术后纤维性改变，未见明显活动性病变。"}}
    [[/novel-ui]]

### 3. 单条 X 帖子 `social:x-post`

必填：`displayName`、`handle`、`text`、`timestamp`。可选：`id`、`avatar`、`verified`、`translatedFrom`、`translationLabel`、`media`、`replies`、`reposts`、`likes`、`views`。媒体 `type` 只能是 `image` 或 `link`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"social","variant":"x-post","props":{"displayName":"Sasha M.","handle":"sasha_m","verified":true,"text":"舞滨的雨比预想中更冷。","timestamp":"39分","translatedFrom":"英语","media":[{"type":"image","alt":"雨中的排队现场"}],"replies":218,"reposts":906,"likes":4201,"views":128000}}
    [[/novel-ui]]

### 4. X 信息流 `social:x-feed`

必填：`posts`，其中每项遵循 `social:x-post` 的字段规则。可选：`title`、`activeTab`；`activeTab` 只能为 `for-you` 或 `following`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"social","variant":"x-feed","props":{"title":"首页","activeTab":"for-you","posts":[{"id":"p1","displayName":"lmaood","handle":"wh0y0uf0ll0w","timestamp":"14小时","text":"今天感觉好累啊。","replies":8,"reposts":218,"likes":444,"views":5600},{"id":"p2","displayName":"눈제비","handle":"noonjebi0512","verified":true,"timestamp":"15小时","text":"机场照片看起来像是和好了。","likes":26,"views":817}]}}
    [[/novel-ui]]

### 5. X 通知 `social:x-notifications`

必填：`notifications`。每条通知必填 `id`、`displayName`、`timestamp`、`text`；可选 `type`、`handle`、`avatar`、`translatedFrom`。`type` 只能为 `post`、`mention` 或 `verified`。`activeTab` 可为 `all`、`mentions` 或 `verified`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"social","variant":"x-notifications","props":{"activeTab":"all","notifications":[{"id":"n1","type":"mention","displayName":"F*","timestamp":"39分","translatedFrom":"英语","text":"那些剪刀石头布到底是怎么回事 😭"}]}}
    [[/novel-ui]]

### 6. X 趋势 `social:x-trends`

必填：`trends`。每项必填 `id`、`category`、`title`，可选非负数 `posts`。`activeTab` 可为 `explore`、`trending`、`news`、`sports`、`entertainment`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"social","variant":"x-trends","props":{"searchPlaceholder":"搜索","activeTab":"explore","trends":[{"id":"t1","category":"韩国 的趋势","title":"舞滨限定商品","posts":12500},{"id":"t2","category":"娱乐 · 热门","title":"机场照片"}]}}
    [[/novel-ui]]

### 7. theqoo 论坛 `article:theqoo`

必填：`title`、`date`、`content`。可选：`category`、`author`、`views`、`comments`。评论必填 `id`、`author`、`text`，可选 `time`、`likes`。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"article","variant":"theqoo","props":{"category":"스퀘어","title":"지금 실시간으로 난리 난 마이하마 한정판","date":"2026.09.13 06:10","views":18244,"content":"새벽부터 줄이 끝도 없이 이어지고 있음.","comments":[{"id":"1","author":"무명의 더쿠","text":"비까지 오는데 사람이 정말 많다","time":"06:12","likes":31}]}}
    [[/novel-ui]]

### 8. 微博帖子 `social:weibo-post`

必填：`displayName`、`timestamp`、`text`。可选：`handle`、`verified`、`source`、`reposts`、`comments`、`likes`；统计数字必须为非负数。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"social","variant":"weibo-post","props":{"displayName":"首尔夜航","handle":"@seoul_night","verified":true,"timestamp":"2026-09-13 23:48","source":"iPhone客户端","text":"医院走廊的灯直到深夜仍然亮着。","reposts":126,"comments":308,"likes":2401}}
    [[/novel-ui]]

### 9–12. 交通票 `ticket:flight|ferry|rail|bus`

四类交通票共用字段。必填：`operator`、`ticketNumber`、`passenger`、`origin`、`destination`、`date`、`departure`、`serviceNumber`。`origin`/`destination` 必须有 `name`，可选 `code`。通用可选：`operatorCode`、`theme`、`arrival`、`seat`、`travelClass`、`boardingTime`、`terminal`、`duration`。`theme` 只能为 `blue`、`red`、`green`、`gold`。

飞机票使用 `gate`：

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"ticket","variant":"flight","props":{"operator":"Hanul Airways","operatorCode":"HA","theme":"blue","ticketNumber":"HA-20260913-0182","passenger":"SEO YIHYUN","origin":{"code":"ICN","name":"Seoul Incheon"},"destination":{"code":"JFK","name":"New York John F. Kennedy"},"date":"2026-09-13","departure":"23:40","arrival":"23:15 +1","serviceNumber":"HA208","travelClass":"Business","seat":"03A","boardingTime":"22:55","gate":"27","terminal":"T2","duration":"14h 35m"}}
    [[/novel-ui]]

船票使用 `pier`：

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"ticket","variant":"ferry","props":{"operator":"Korea Strait Ferry","operatorCode":"KSF","theme":"gold","ticketNumber":"KSF-0913-204","passenger":"凑崎纱夏","origin":{"code":"BSP","name":"Busan Port"},"destination":{"code":"HKT","name":"Hakata Port"},"date":"2026-09-13","departure":"19:30","arrival":"翌日 06:00","serviceNumber":"SEA STAR 7","travelClass":"Deluxe Cabin","seat":"D-208","boardingTime":"18:40","pier":"3","duration":"10h 30m"}}
    [[/novel-ui]]

高铁/火车票使用 `platform`：

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"ticket","variant":"rail","props":{"operator":"Korea Express Rail","operatorCode":"KER","theme":"red","ticketNumber":"KER-884201","passenger":"徐以炫","origin":{"code":"SEL","name":"Seoul"},"destination":{"code":"BSN","name":"Busan"},"date":"2026-09-13","departure":"08:12","arrival":"10:49","serviceNumber":"KTX 021","travelClass":"First Class","seat":"2A","platform":"6","duration":"2h 37m"}}
    [[/novel-ui]]

巴士票使用 `platform`：

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"ticket","variant":"bus","props":{"operator":"Seoul–Sokcho Express","operatorCode":"SSE","theme":"green","ticketNumber":"SSE-130944","passenger":"凑崎纱夏","origin":{"code":"SEL","name":"Seoul Express Bus Terminal"},"destination":{"code":"SCH","name":"Sokcho Express Bus Terminal"},"date":"2026-09-13","departure":"09:40","arrival":"12:10","serviceNumber":"BUS 118","travelClass":"Premium","seat":"07","platform":"14","duration":"2h 30m"}}
    [[/novel-ui]]

### 13. 虚构身份证 `document:identity-card`

必填：`country`、`fullName`、`idNumber`、`birthDate`、`validUntil`。可选：`documentName`、`sex`、`nationality`、`validFrom`、`authority`。头像由 Renderer 自动生成，不需要提供头像 URL。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"document","variant":"identity-card","props":{"country":"Republic of Haneul","documentName":"NATIONAL IDENTITY CARD","fullName":"徐以炫","idNumber":"HY-990413-7•••••","birthDate":"1999-04-13","sex":"F","nationality":"HANEUL","validFrom":"2024-04-13","validUntil":"2034-04-12","authority":"Haneul Civil Registry"}}
    [[/novel-ui]]

### 14. 工作牌 `document:work-card`

必填：`organization`、`fullName`、`title`、`employeeId`。可选：`department`、`validUntil`、`accessLevel`。头像由 Renderer 自动生成，不需要提供头像 URL。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"document","variant":"work-card","props":{"organization":"Hanul Airways","department":"Flight Operations","fullName":"徐以炫","title":"Captain","employeeId":"HA-FO-0713","validUntil":"2028-12-31","accessLevel":"AIRCREW"}}
    [[/novel-ui]]

## 四、正文中混合多个组件

正文与区块可以自然交错：

    她的手机在桌面上震动了一下。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"chat","variant":"kakao","props":{"title":"纱夏","messages":[{"id":"1","sender":"sana","side":"left","text":"到医院了吗？","time":"23:41"}]}}
    [[/novel-ui]]

    她没有回复，而是展开刚拿到的检查报告。

    [[novel-ui]]
    {"schema":"novel-ui","version":"1.0","component":"document","variant":"medical","props":{"hospital":"Hanul Medical Center","department":"Radiology","patient":"徐以炫","reportTitle":"CT Examination Report","fields":[{"label":"Date","value":"2026-09-13"},{"label":"Examination","value":"Chest CT"}],"findings":"未见急性异常。"}}
    [[/novel-ui]]

## 五、输出前自检

- 标记是否完整配对？
- 是否没有 Markdown 代码围栏？
- JSON 是否可以被 `JSON.parse`？
- `schema`、`version`、`component`、`variant`、`props` 是否齐全？
- `component:variant` 是否属于当前 14 种？
- 每个必填字段是否存在且类型正确？
- 数字统计是否使用数字而非带逗号的字符串？
- `side`、`type`、`theme`、`activeTab` 是否使用允许值？
- 是否只输出数据，没有 HTML 或可执行代码？

若无法满足某个 Renderer 的必填字段，应改用普通小说文本，不要输出残缺 Novel UI。
