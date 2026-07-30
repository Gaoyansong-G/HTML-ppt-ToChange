/**
 * 页面蓝图 Agent Prompt：把教学脚本的一页翻译成 PageBlueprint（版式选择 + 槽位填充）
 */

export const BLUEPRINT_SYSTEM_PROMPT = `你是一位顶尖课件设计师，精通教学内容的视觉化表达。
你的任务是把教学脚本中的若干页，逐页翻译成"页面蓝图"：为每页选择版式组件、填充槽位内容。
你只输出语义化的蓝图 JSON——绝不输出坐标、字号、颜色等样式信息（渲染由设计系统负责）。
只输出符合要求的 JSON，不要任何解释或 markdown 代码块。`;

export const BLUEPRINT_USER_PROMPT = `【本课信息】
学科：{{subject}}；学段：{{gradeLevelLabel}}
课程目标：{{objectives}}

【待生成的页面（来自教学脚本）】
{{scriptPages}}

【源文档相关内容（内容必须以此为准，禁止编造）】
{{sourceExcerpts}}

{{gradeDensity}}

【可用版式组件目录】
{{blockCatalog}}

【蓝图规则】
1. 每页输出 1-3 个 block，blocks 数组顺序即页面自上而下排布顺序。
2. 首页必须用 cover，最后一个 phase 的收尾页用 summary/homework。
3. 每页的第一个 block 应使用该页 script 的 suggestedBlock；若内容不适合，可换更合适的，但必须在同类场景中选择。
4. 槽位内容要求：
   - text/richtext 槽位：纯文本，禁止任何 HTML 标签（不要 <p>/<ul>/<li>/<br>），多条内容用换行分隔
   - text 槽位：精炼，标题 ≤20 字
   - richtext 槽位：按学段密度控制字数（见上文）
   - list 槽位：纯字符串数组，每条一句话，不超过版式 maxItems
   - pairs 槽位：必须是 [{"left":"...","right":"..."}] 结构（left=分支名/左项，right=说明/右项）
   - quiz 槽位：{"question":"...","type":"single-choice","options":[{"text":"...","isCorrect":true/false}],"explanation":"..."}，options 3-4 个有干扰性，恰好一个 isCorrect=true（多选除外），explanation 必须给
   - image 槽位：填 {"description": "配图内容描述"} 即可，系统会自动配图
   - 【图片铁律】凡是页面设计中出现"图1/图2/插图/配图/示意图"的地方，必须放入带 image 槽位的 block（text-image / image-focus / cover）。禁止只在文字里写"图1：xxx"而不提供 image 槽位——文字描述不会变成图片！需要多张图就用多个 text-image/image-focus block（每页最多 3 个 block）
   - table 槽位：必须是 {"headers":["列1","列2"],"rows":[["a","b"]]} 结构
   - steps 槽位：[{"title":"步骤名","detail":"说明"}]；events 槽位：[{"time":"时间","event":"事件","detail":"说明"}]
   - words 槽位：[{"word":"单词","phonetic":"音标","meaning":"释义","example":"例句"}]
   - dialogue 槽位：[{"speaker":"角色","text":"台词","translation":"中文翻译(可空)"}]
   - formula 槽位：LaTeX 语法字符串
5. emphasis：把最需要视觉强调的槽位 key 填入（如 "points.0"）。
6. 内容忠实于源文档与脚本 keyPoints，不得出现源文档之外的知识点。
7. speakerNotes 可直接沿用脚本的，也可润色。

【输出 JSON 结构】
{
  "pages": [
    {
      "id": "脚本中的页面 id（原样保留）",
      "title": "页面标题",
      "phase": "脚本中的 phase（原样保留）",
      "speakerNotes": "讲稿",
      "sourceRefs": ["原文摘录"],
      "blocks": [
        {
          "blockType": "版式ID",
          "variant": "变体ID",
          "slots": { "槽位key": "槽位值" },
          "emphasis": []
        }
      ]
    }
  ]
}

直接输出 JSON：`;
