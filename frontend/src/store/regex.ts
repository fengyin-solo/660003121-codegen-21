import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NFA, MatchResult, MatchStep, RegexTemplate, ASTNode, ComplexityEstimate, RiskSource, RiskLevel } from '../types'

const GROUP_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export const TEMPLATES: RegexTemplate[] = [
  { name: '邮箱地址', pattern: '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})$', description: '匹配标准邮箱格式：用户名@域名.顶级域', testString: 'user@example.com admin@mail.org test.user+tag@sub.domain.co.uk', category: '常用' },
  { name: 'URL链接', pattern: '^(https?)://([^/:]+)(?::(\\d+))?(.*)$', description: '匹配HTTP/HTTPS URL：协议://主机:端口/路径', testString: 'https://www.example.com:8080/path/to/page http://localhost:3000/api', category: '常用' },
  { name: 'IPv4地址', pattern: '^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$', description: '匹配IPv4地址四段数字', testString: '192.168.1.1 10.0.0.1 255.255.255.0', category: '常用' },
  { name: '日期格式', pattern: '^(\\d{4})-(\\d{2})-(\\d{2})$', description: '匹配YYYY-MM-DD日期', testString: '2024-01-15 1999-12-31 2025-06-06', category: '常用' },
  { name: '手机号码', pattern: '^1[3-9]\\d{9}$', description: '匹配中国大陆手机号', testString: '13800138000 15912345678 18600000000', category: '常用' },
  { name: '身份证号', pattern: '^(\\d{6})(\\d{4})(\\d{2})(\\d{2})(\\d{3})([0-9Xx])$', description: '18位身份证：地区码+出生日期+顺序码+校验码', testString: '11010119900101001X 440304200512120039', category: '常用' },
  { name: '十六进制颜色', pattern: '^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$', description: '匹配#RGB或#RRGGBB格式', testString: '#FF5733 #abc #1A2B3C ff0000', category: '前端' },
  { name: '邮政编码', pattern: '^\\d{6}$', description: '6位中国邮编', testString: '100000 518000 200120', category: '常用' },
  { name: '浮点数', pattern: '^-?\\d+\\.\\d+$', description: '匹配带小数点的数字', testString: '3.14 -0.5 100.0', category: '数字' },
  { name: '科学计数法', pattern: '^-?\\d+(\\.\\d+)?[eE][+-]?\\d+$', description: '匹配科学计数法数字', testString: '1.5e10 -2.3E-4 6.022e23', category: '数字' },
  { name: 'MAC地址', pattern: '^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$', description: '匹配MAC地址XX:XX:XX:XX:XX:XX', testString: '00:1A:2B:3C:4D:5E AA-BB-CC-DD-EE-FF', category: '网络' },
  { name: 'UUID', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', description: '标准UUID格式', testString: '550e8400-e29b-41d4-a716-446655440000', category: '网络' },
  { name: 'QQ号', pattern: '^[1-9]\\d{4,10}$', description: '5-11位QQ号', testString: '12345 10000 1234567890', category: '常用' },
  { name: '密码强度', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$', description: '至少8位含大小写字母数字特殊字符', testString: 'Passw0rd! Str0ng@Pass', category: '安全' },
  { name: '中文姓名', pattern: '^[\\u4e00-\\u9fa5]{2,4}$', description: '2-4位中文字符', testString: '张三 李世明 王小明', category: '常用' },
  { name: '车牌号', pattern: '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-HJ-NP-Z0-9]{5}$', description: '中国车牌格式', testString: '京A12345 沪B6789X', category: '常用' },
  { name: 'HTML标签', pattern: '<(\\w+)(\\s[^>]*)?>(.*?)</\\1>', description: '匹配HTML开闭标签对', testString: '<div class="x">content</div> <span>text</span>', category: '前端' },
  { name: '文件扩展名', pattern: '^.+\\.(\\w+)$', description: '提取文件扩展名', testString: 'image.png doc.pdf index.html', category: '前端' },
  { name: '经纬度', pattern: '^(\\-?\\d{1,3}\\.\\d+)\\s*,\\s*(\\-?\\d{1,3}\\.\\d+)$', description: '匹配经纬度坐标', testString: '116.404,39.915 -73.9857,40.7484', category: '地理' },
  { name: '版本号', pattern: '^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(\\w+))?$', description: '语义化版本号x.y.z-tag', testString: '1.0.0 2.3.1-beta 10.20.30', category: '常用' },
  { name: '时间格式', pattern: '^([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?$', description: 'HH:MM或HH:MM:SS', testString: '14:30 23:59:59 00:00', category: '常用' }
]

interface StateNode {
  id: number
  isAccept: boolean
  transitions: Map<string, number[]>
  epsilonTransitions: number[]
}

function buildNFA(pattern: string): { states: StateNode[]; startState: number; acceptStates: number[] } {
  const states: StateNode[] = []
  let stateCounter = 0
  let pos = 0
  let groupCount = 0

  function newState(): number {
    const id = stateCounter++
    states.push({ id, isAccept: false, transitions: new Map(), epsilonTransitions: [] })
    return id
  }

  function addTransition(from: number, symbol: string, to: number) {
    if (!states[from].transitions.has(symbol)) {
      states[from].transitions.set(symbol, [])
    }
    states[from].transitions.get(symbol)!.push(to)
  }

  function addEpsilon(from: number, to: number) {
    states[from].epsilonTransitions.push(to)
  }

  function parseCharClass(): (ch: string) => boolean {
    const negative = pattern[pos] === '^'
    if (negative) pos++
    const ranges: [string, string][] = []
    const chars: string[] = []
    while (pos < pattern.length && pattern[pos] !== ']') {
      if (pattern[pos + 1] === '-' && pattern[pos + 2] && pattern[pos + 2] !== ']') {
        ranges.push([pattern[pos], pattern[pos + 2]])
        pos += 3
      } else {
        chars.push(pattern[pos])
        pos++
      }
    }
    pos++ // skip ]
    return (ch: string) => {
      if (negative) {
        return !chars.includes(ch) && !ranges.some(([s, e]) => ch >= s && ch <= e)
      }
      return chars.includes(ch) || ranges.some(([s, e]) => ch >= s && ch <= e)
    }
  }

  function parseConcat(): [number, number] {
    let start = newState()
    let end = start
    while (pos < pattern.length && !['|', ')'].includes(pattern[pos])) {
      let segStart: number, segEnd: number
      const ch = pattern[pos]
      if (ch === '(') {
        pos++
        groupCount++
        if (pattern[pos] === '?') {
          pos++
          if (pattern[pos] === ':') { pos++; }
          const [s, e] = parseOr()
          segStart = s; segEnd = e
        } else {
          const [s, e] = parseOr()
          segStart = s; segEnd = e
        }
        pos++ // skip )
      } else if (ch === '[') {
        pos++
        segStart = newState()
        segEnd = newState()
        const matcher = parseCharClass()
        addTransition(segStart, '__class_' + segStart, segEnd)
        ;(states[segEnd] as any)._matcher = matcher
      } else if (ch === '.') {
        segStart = newState()
        segEnd = newState()
        addTransition(segStart, '__dot', segEnd)
        pos++
      } else if (ch === '\\') {
        pos++
        const escaped = pattern[pos]
        segStart = newState()
        segEnd = newState()
        if (escaped === 'd') addTransition(segStart, '__digit', segEnd)
        else if (escaped === 'w') addTransition(segStart, '__word', segEnd)
        else if (escaped === 's') addTransition(segStart, '__space', segEnd)
        else addTransition(segStart, escaped, segEnd)
        pos++
      } else if (ch === '^' || ch === '$') {
        segStart = newState()
        segEnd = segStart
        pos++
      } else {
        segStart = newState()
        segEnd = newState()
        addTransition(segStart, ch, segEnd)
        pos++
      }

      // Handle quantifiers
      while (pos < pattern.length && ['*', '+', '?', '{'].includes(pattern[pos])) {
        const q = pattern[pos]
        if (q === '{') {
          while (pos < pattern.length && pattern[pos] !== '}') pos++
          pos++
        } else {
          pos++
        }
        const qStart = newState()
        const qEnd = newState()
        addEpsilon(qStart, segStart)
        if (q === '*') { addEpsilon(qStart, qEnd); addEpsilon(segEnd, qEnd); addEpsilon(segEnd, segStart) }
        else if (q === '+') { addEpsilon(segEnd, qEnd); addEpsilon(segEnd, segStart) }
        else if (q === '?') { addEpsilon(qStart, qEnd); addEpsilon(segEnd, qEnd) }
        segStart = qStart; segEnd = qEnd
        if (pos < pattern.length && pattern[pos] === '?') pos++ // lazy
      }

      if (end !== segStart) addEpsilon(end, segStart)
      end = segEnd
    }
    return [start, end]
  }

  function parseOr(): [number, number] {
    const [s1, e1] = parseConcat()
    let start = s1, end = e1
    while (pos < pattern.length && pattern[pos] === '|') {
      pos++
      const [s2, e2] = parseConcat()
      const ns = newState(), ne = newState()
      addEpsilon(ns, start); addEpsilon(ns, s2)
      addEpsilon(end, ne); addEpsilon(e2, ne)
      start = ns; end = ne
    }
    return [start, end]
  }

  const [startState, acceptState] = parseOr()
  states[acceptState].isAccept = true
  return { states, startState, acceptStates: [acceptState] }
}

function epsilonClosure(states: StateNode[], stateId: number): Set<number> {
  const closure = new Set<number>([stateId])
  const stack = [stateId]
  while (stack.length) {
    const s = stack.pop()!
    for (const next of states[s].epsilonTransitions) {
      if (!closure.has(next)) {
        closure.add(next)
        stack.push(next)
      }
    }
  }
  return closure
}

function matchTransition(state: StateNode, symbol: string): number[] {
  const results: number[] = []
  for (const [sym, targets] of state.transitions) {
    if (sym === symbol) { results.push(...targets); continue }
    if (sym === '__dot' && symbol !== '\n') { results.push(...targets); continue }
    if (sym === '__digit' && /\d/.test(symbol)) { results.push(...targets); continue }
    if (sym === '__word' && /\w/.test(symbol)) { results.push(...targets); continue }
    if (sym === '__space' && /\s/.test(symbol)) { results.push(...targets); continue }
    if (sym.startsWith('__class_')) {
      const matcher = (state as any)._matcher
      if (matcher && matcher(symbol)) results.push(...targets)
    }
  }
  return results
}

function runMatch(states: StateNode[], startState: number, input: string): MatchResult {
  const steps: MatchStep[] = []
  let backtracks = 0
  let stepIndex = 0
  const startTime = performance.now()

  // Try to match from each position
  for (let startPos = 0; startPos <= input.length; startPos++) {
    let currentStates = Array.from(epsilonClosure(states, startState))
    let matched = false
    let matchEnd = startPos

    for (let i = startPos; i < input.length; i++) {
      const char = input[i]
      const nextStates: number[] = []
      const seen = new Set<number>()

      for (const s of currentStates) {
        const targets = matchTransition(states[s], char)
        for (const t of targets) {
          const closure = epsilonClosure(states, t)
          for (const c of closure) {
            if (!seen.has(c)) {
              seen.add(c)
              nextStates.push(c)
              steps.push({
                stepIndex: stepIndex++,
                charIndex: i,
                char,
                currentState: s,
                nextState: c,
                transition: char,
                isBacktrack: false,
                isMatch: true
              })
            }
          }
        }
      }

      if (nextStates.length === 0) {
        if (currentStates.some(s => states[s].isAccept)) { matched = true; matchEnd = i; break }
        backtracks++
        steps.push({
          stepIndex: stepIndex++,
          charIndex: i,
          char,
          currentState: currentStates[0] || -1,
          nextState: -1,
          transition: 'FAIL',
          isBacktrack: true,
          isMatch: false
        })
        break
      }
      currentStates = nextStates
      if (currentStates.some(s => states[s].isAccept)) { matched = true; matchEnd = i + 1 }
    }

    if (matched || (startPos === input.length && currentStates.some(s => states[s].isAccept))) {
      const matchText = input.substring(startPos, matchEnd)
      const duration = performance.now() - startTime
      return {
        matched: true,
        matchText,
        groups: [matchText],
        steps,
        backtracks,
        totalSteps: stepIndex,
        duration: Math.round(duration * 100) / 100
      }
    }
  }

  const duration = performance.now() - startTime
  return { matched: false, matchText: '', groups: [], steps, backtracks, totalSteps: stepIndex, duration: Math.round(duration * 100) / 100 }
}

export function computeNFA(nfaResult: ReturnType<typeof buildNFA>): NFA {
  const nodes = nfaResult.states.map((s, i) => ({
    id: s.id,
    isStart: i === nfaResult.startState,
    isAccept: nfaResult.acceptStates.includes(s.id),
    x: 0, y: 0
  }))

  // Layout: circular
  const cx = 400, cy = 300, radius = 200
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2
    n.x = cx + Math.cos(angle) * radius
    n.y = cy + Math.sin(angle) * radius
  })

  const transitions: any[] = []
  nfaResult.states.forEach(s => {
    s.transitions.forEach((targets, symbol) => {
      targets.forEach(t => {
        transitions.push({ from: s.id, to: t, symbol: symbol.startsWith('__') ? symbol.replace('__', '') : symbol, label: symbol.startsWith('__') ? symbol.replace('__', '') : symbol })
      })
    })
    s.epsilonTransitions.forEach(t => {
      transitions.push({ from: s.id, to: t, symbol: null, label: 'ε' })
    })
  })

  return { states: nodes, transitions, startState: nfaResult.startState, acceptStates: nfaResult.acceptStates }
}

export function parseAST(pattern: string): ASTNode {
  let pos = 0
  let groupIdx = 0

  function parseAtom(): ASTNode {
    const ch = pattern[pos]
    if (ch === '(') {
      pos++
      if (pattern[pos] === '?') { pos++; if (pattern[pos] === ':') pos++ }
      else groupIdx++
      const node = parseOr()
      if (pattern[pos] === ')') pos++
      return { type: 'group', children: [node], groupIndex: groupIdx }
    }
    if (ch === '[') {
      pos++
      let cls = ''
      while (pos < pattern.length && pattern[pos] !== ']') { cls += pattern[pos]; pos++ }
      pos++
      return { type: 'charclass', value: cls }
    }
    if (ch === '.') { pos++; return { type: 'dot' } }
    if (ch === '\\') {
      pos++
      const e = pattern[pos]; pos++
      if (e === 'd') return { type: 'digit' }
      if (e === 'w') return { type: 'word' }
      if (e === 's') return { type: 'space' }
      return { type: 'char', value: e }
    }
    if (ch === '^' || ch === '$') { pos++; return { type: 'anchor', value: ch } }
    pos++
    return { type: 'char', value: ch }
  }

  function parseQuantifier(): ASTNode {
    let node = parseAtom()
    while (pos < pattern.length && ['*', '+', '?', '{'].includes(pattern[pos])) {
      const q = pattern[pos]
      if (q === '{') {
        while (pos < pattern.length && pattern[pos] !== '}') pos++
        pos++
      } else {
        pos++
      }
      const type = q === '*' ? 'star' : q === '+' ? 'plus' : 'question'
      node = { type, children: [node] }
      if (pos < pattern.length && pattern[pos] === '?') pos++
    }
    return node
  }

  function parseConcat(): ASTNode {
    const nodes: ASTNode[] = []
    while (pos < pattern.length && !['|', ')'].includes(pattern[pos])) {
      nodes.push(parseQuantifier())
    }
    if (nodes.length === 1) return nodes[0]
    return { type: 'concat', children: nodes }
  }

  function parseOr(): ASTNode {
    let left = parseConcat()
    while (pos < pattern.length && pattern[pos] === '|') {
      pos++
      const right = parseConcat()
      left = { type: 'or', children: [left, right] }
    }
    return left
  }

  return parseOr()
}

export function analyzeComplexity(pattern: string, testString: string): ComplexityEstimate {
  const riskSources: RiskSource[] = []
  let riskLevel = 'safe' as RiskLevel
  let maxBacktrackPotential = 0

  function addRisk(source: RiskSource) {
    riskSources.push(source)
  }

  function upgradeRisk(newLevel: RiskLevel) {
    const order: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical']
    if (order.indexOf(newLevel) > order.indexOf(riskLevel)) {
      riskLevel = newLevel
    }
  }

  const quantifiers = /[*+?]|\{\d+,\d*\}|\{\d*,\d+\}|\{\d+\}/g

  function checkNestedQuantifiers(pattern: string) {
    const groupStack: number[] = []
    const groupHasQuantifier: Map<number, boolean> = new Map()
    let depth = 0

    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i]
      if (ch === '(') {
        depth++
        groupStack.push(i)
      } else if (ch === ')' && groupStack.length > 0) {
        const groupStart = groupStack.pop()!
        depth--
        if (i + 1 < pattern.length && quantifiers.test(pattern[i + 1])) {
          quantifiers.lastIndex = 0
          if (depth >= 1) {
            addRisk({
              type: 'nested_quantifier',
              description: '嵌套量词：分组内已含有量词，外层再次施加量词会导致指数级回溯',
              pattern: pattern.substring(groupStart, i + 2),
              position: groupStart,
              suggestion: '使用非捕获分组(?:)或展开循环避免嵌套量词，考虑用原子组或占有优先量词',
              badExample: '(a+)+b',
              goodExample: 'a+b 或 (?:a+)b'
            })
            upgradeRisk('critical')
            maxBacktrackPotential = Math.max(maxBacktrackPotential, 10000)
          }
        }
        if (groupHasQuantifier.has(groupStart)) {
          groupHasQuantifier.delete(groupStart)
        }
      } else if (quantifiers.test(ch)) {
        quantifiers.lastIndex = 0
        if (groupStack.length > 0) {
          groupHasQuantifier.set(groupStack[groupStack.length - 1], true)
        }
      }
    }

    const nestedPatterns = [
      /\(([^)]*[*+?][^)]*)\)[*+?]/g,
      /\(\?:([^)]*[*+?][^)]*)\)[*+?]/g
    ]
    for (const np of nestedPatterns) {
      let m: RegExpExecArray | null
      while ((m = np.exec(pattern)) !== null) {
        addRisk({
          type: 'nested_quantifier',
          description: '嵌套量词：外层量词作用于内部含有量词的表达式，形成指数级状态空间',
          pattern: m[0],
          position: m.index,
          suggestion: '解套量词，使用展开式写法替代嵌套重复结构',
          badExample: '([0-9]+)*',
          goodExample: '[0-9]*'
        })
        upgradeRisk('high')
        maxBacktrackPotential = Math.max(maxBacktrackPotential, 5000)
      }
      np.lastIndex = 0
    }
  }

  function checkOverlappingAlternation(pattern: string) {
    const orPattern = /\(([^()|]*\|[^()|]*)\)([*+?]|{\d+,})?/g
    let m: RegExpExecArray | null
    while ((m = orPattern.exec(pattern)) !== null) {
      const alternates = m[1].split('|')
      for (let i = 0; i < alternates.length; i++) {
        for (let j = i + 1; j < alternates.length; j++) {
          const a = alternates[i].trim()
          const b = alternates[j].trim()
          if (a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a) || a === b)) {
            const isRepeated = !!m[2]
            addRisk({
              type: 'overlapping_alternation',
              description: isRepeated ? '重叠选择分支 + 量词：两个分支可匹配相同内容，重复时会大量回溯' : '重叠选择分支：两个分支前缀相同，匹配失败时会尝试全部组合',
              pattern: m[0],
              position: m.index,
              suggestion: '将更长的分支放在前面，或使用锚点/边界消除歧义，避免对含重叠分支的分组施加量词',
              badExample: '(a|ab)*c',
              goodExample: '(ab|a)?c 或 a(?:b)?c'
            })
            upgradeRisk(isRepeated ? 'critical' : 'medium')
            maxBacktrackPotential = Math.max(maxBacktrackPotential, isRepeated ? 8000 : 500)
          }
        }
      }
    }
    orPattern.lastIndex = 0

    const greedyOr = /([^|()]+)\|([^|()]+)([*+?])/g
    while ((m = greedyOr.exec(pattern)) !== null) {
      const a = m[1].trim()
      const b = m[2].trim()
      if (a.length > 0 && b.length > 0 && (a.endsWith(b.slice(0, 1)) || b.endsWith(a.slice(0, 1)))) {
        addRisk({
          type: 'overlapping_alternation',
          description: '选择分支的末尾与下一分支开头重叠，会触发额外回溯尝试',
          pattern: m[0],
          position: m.index,
          suggestion: '重构分支顺序，消除公共前缀/后缀的歧义',
          badExample: 'ab|bc+',
          goodExample: 'a(?:b|bc)+'
        })
        upgradeRisk('low')
        maxBacktrackPotential = Math.max(maxBacktrackPotential, 200)
      }
    }
    greedyOr.lastIndex = 0
  }

  function checkAdjacentRepeating(pattern: string) {
    const adjacent = /([.[\]\\\w\d()]+[*+?])([\s]*)([.[\]\\\w\d()]+[*+?])/g
    let m: RegExpExecArray | null
    while ((m = adjacent.exec(pattern)) !== null) {
      const left = m[1]
      const right = m[3]
      const leftMatchAny = /\.|\[.*\^.*\]|\\[dwsS]/.test(left)
      const rightMatchAny = /\.|\[.*\^.*\]|\\[dwsS]/.test(right)
      if (leftMatchAny && rightMatchAny) {
        addRisk({
          type: 'adjacent_repeating',
          description: '相邻通配量词：两个相邻的量词都能匹配任意字符，边界模糊导致大量回溯尝试',
          pattern: m[0],
          position: m.index,
          suggestion: '明确两个量词之间的分隔边界（如锚点、固定字符），或使用占有优先量词消除回溯',
          badExample: '.*.*x',
          goodExample: '[^x]*x'
        })
        upgradeRisk('high')
        maxBacktrackPotential = Math.max(maxBacktrackPotential, 3000)
      } else if (leftMatchAny || rightMatchAny) {
        addRisk({
          type: 'adjacent_repeating',
          description: '相邻的重复结构可能因边界不清晰产生不必要的回溯尝试',
          pattern: m[0],
          position: m.index,
          suggestion: '添加明确的分隔符或锚点以界定两部分的边界',
          badExample: '\\w+\\d*',
          goodExample: '(\\w+?)(\\d*)'
        })
        upgradeRisk('medium')
        maxBacktrackPotential = Math.max(maxBacktrackPotential, 400)
      }
    }
    adjacent.lastIndex = 0
  }

  function checkWideCharclass(pattern: string) {
    const widePatterns = [
      { regex: /\\s\s*\\S/g, msg: '[\\s\\S] 型：匹配任意字符+量词在长文本会产生大量分支' },
      { regex: /\\d\s*\\D/g, msg: '[\\d\\D] 型：数字与非数字组合+量词等于全匹配' },
      { regex: /\\w\s*\\W/g, msg: '[\\w\\W] 型：词与非词组合等于匹配任意字符' },
      { regex: /\[\^\\?[\w]\]\*/g, msg: '否定字符类+贪婪量词：匹配直到失败才回溯，长串时开销大' }
    ]
    for (const wp of widePatterns) {
      let m: RegExpExecArray | null
      while ((m = wp.regex.exec(pattern)) !== null) {
        const followedByQuantifier = /[*+?{]/.test(pattern[m.index + m[0].length] || '')
        if (followedByQuantifier) {
          addRisk({
            type: 'wide_charclass',
            description: wp.msg,
            pattern: m[0] + (pattern[m.index + m[0].length] || ''),
            position: m.index,
            suggestion: '如果确实需要匹配任意字符，考虑使用非贪婪量词或增加锚点限制匹配范围',
            badExample: '[\\s\\S]*end',
            goodExample: '(?:(?!end)[\\s\\S])*end'
          })
          upgradeRisk('high')
          maxBacktrackPotential = Math.max(maxBacktrackPotential, 6000)
        }
      }
      wp.regex.lastIndex = 0
    }
  }

  function checkGreedyWithBacktrack(pattern: string) {
    const greedyDotStar = /\.\*([^.$\[\]\\|()*+?])(?!\$)/g
    let m: RegExpExecArray | null
    while ((m = greedyDotStar.exec(pattern)) !== null) {
      const afterChar = m[1]
      const occurrenceCount = (testString.match(new RegExp(afterChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      if (occurrenceCount > 3 || testString.length > 30) {
        addRisk({
          type: 'greedy_with_backtrack',
          description: `贪婪 .* 后跟固定字符 '${afterChar}'：会先吞掉全部字符串，再逐字符回退查找，在目标字符出现次数多（${occurrenceCount}次）时反复回溯`,
          pattern: m[0],
          position: m.index,
          suggestion: `改用否定字符类 [^${afterChar}]* 替代 .*，一次性前进到目标位置而无需回溯`,
          badExample: `.*${afterChar}`,
          goodExample: `[^${afterChar}]*${afterChar}`
        })
        upgradeRisk(occurrenceCount > 8 ? 'critical' : 'medium')
        maxBacktrackPotential = Math.max(maxBacktrackPotential, occurrenceCount * 100)
      }
    }
    greedyDotStar.lastIndex = 0

    const plusBacktrack = /\.\+([^.$\[\]\\|()*+?])/g
    while ((m = plusBacktrack.exec(pattern)) !== null) {
      addRisk({
        type: 'greedy_with_backtrack',
        description: `贪婪 .+ 后跟固定字符：至少匹配一次后再回退，长字符串下同样会产生大量回溯`,
        pattern: m[0],
        position: m.index,
        suggestion: '使用非贪婪 .+? 或否定字符类消除不必要的回退',
        badExample: '.+end',
        goodExample: '[^e]+end 或 .+?end'
      })
      upgradeRisk('low')
      maxBacktrackPotential = Math.max(maxBacktrackPotential, 150)
    }
    plusBacktrack.lastIndex = 0
  }

  try {
    checkNestedQuantifiers(pattern)
    checkOverlappingAlternation(pattern)
    checkAdjacentRepeating(pattern)
    checkWideCharclass(pattern)
    checkGreedyWithBacktrack(pattern)
  } catch (e) {
  }

  if (riskSources.length === 0) {
    const quantifierCount = (pattern.match(/[*+?]/g) || []).length
    if (quantifierCount >= 4) {
      upgradeRisk('low')
      addRisk({
        type: 'greedy_with_backtrack',
        description: '多个量词同时存在：虽然无明显冲突，但组合后仍可能在极端输入下产生较多步骤',
        pattern: `共${quantifierCount}个量词`,
        position: 0,
        suggestion: '如果性能敏感，可审查各量词间是否存在边界模糊的情况',
        badExample: 'a*b*c*d*e',
        goodExample: '根据实际需要减少或明确各部分边界'
      })
      maxBacktrackPotential = Math.max(maxBacktrackPotential, 50)
    }
  }

  const complexityMap: Record<RiskLevel, string> = {
    safe: 'O(n) 线性',
    low: 'O(n·k) 近似线性',
    medium: 'O(n²) 平方级',
    high: 'O(2ⁿ) 指数级',
    critical: 'O(n!) / 灾难级'
  }

  let warning: string | null = null
  if (riskLevel === 'critical') {
    warning = '⚠ 严重：此正则在输入较长或结构不利时可能引发灾难性回溯，导致浏览器卡死，请务必重构！'
  } else if (riskLevel === 'high') {
    warning = '⚠ 警告：此正则存在较高回溯风险，在长文本匹配时可能显著变慢'
  } else if (riskLevel === 'medium') {
    warning = '⚠ 提示：此正则可能产生中等程度的回溯，建议优化以获得最佳性能'
  }

  return {
    riskLevel,
    estimatedComplexity: complexityMap[riskLevel],
    riskSources,
    maxBacktrackPotential,
    warning
  }
}

export const useRegexStore = defineStore('regex', () => {
  const pattern = ref('^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})$')
  const testString = ref('user@example.com admin@mail.org invalid-email')
  const currentStep = ref(0)
  const isPlaying = ref(false)
  const nfa = ref<NFA | null>(null)
  const matchResult = ref<MatchResult | null>(null)
  const ast = ref<ASTNode | null>(null)
  const error = ref('')
  const selectedTemplate = ref<string>('')

  const groupColors = GROUP_COLORS

  const complexityEstimate = computed<ComplexityEstimate>(() => {
    return analyzeComplexity(pattern.value, testString.value)
  })

  const matchHighlight = computed(() => {
    if (!matchResult.value || !matchResult.value.matched) return null
    const matchText = matchResult.value.matchText
    const idx = testString.value.indexOf(matchText)
    if (idx === -1) return null
    return {
      before: testString.value.substring(0, idx),
      match: matchText,
      after: testString.value.substring(idx + matchText.length)
    }
  })

  function execute() {
    error.value = ''
    try {
      const built = buildNFA(pattern.value)
      nfa.value = computeNFA(built)
      matchResult.value = runMatch(built.states, built.startState, testString.value)
      ast.value = parseAST(pattern.value)
      currentStep.value = 0
    } catch (e: any) {
      error.value = e.message || '正则表达式解析错误'
      nfa.value = null
      matchResult.value = null
      ast.value = null
    }
  }

  function setPattern(p: string) {
    pattern.value = p
    execute()
  }

  function setTestString(s: string) {
    testString.value = s
    execute()
  }

  function applyTemplate(t: RegexTemplate) {
    pattern.value = t.pattern
    testString.value = t.testString
    selectedTemplate.value = t.name
    execute()
  }

  function stepForward() {
    if (matchResult.value && currentStep.value < matchResult.value.steps.length - 1) {
      currentStep.value++
    }
  }

  function stepBackward() {
    if (currentStep.value > 0) currentStep.value--
  }

  function resetStep() {
    currentStep.value = 0
  }

  function play() {
    isPlaying.value = true
    const interval = setInterval(() => {
      if (matchResult.value && currentStep.value < matchResult.value.steps.length - 1) {
        currentStep.value++
      } else {
        isPlaying.value = false
        clearInterval(interval)
      }
    }, 200)
  }

  function stop() {
    isPlaying.value = false
  }

  return {
    pattern, testString, currentStep, isPlaying, nfa, matchResult, ast, error,
    selectedTemplate, groupColors, matchHighlight, complexityEstimate,
    execute, setPattern, setTestString, applyTemplate,
    stepForward, stepBackward, resetStep, play, stop
  }
})
