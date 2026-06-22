export interface NFAState {
  id: number
  isStart: boolean
  isAccept: boolean
  x: number
  y: number
}

export interface NFATransition {
  from: number
  to: number
  symbol: string | null // null = epsilon
  label: string
}

export interface NFA {
  states: NFAState[]
  transitions: NFATransition[]
  startState: number
  acceptStates: number[]
}

export interface MatchStep {
  stepIndex: number
  charIndex: number
  char: string
  currentState: number
  nextState: number
  transition: string
  isBacktrack: boolean
  isMatch: boolean
}

export interface MatchResult {
  matched: boolean
  matchText: string
  groups: string[]
  steps: MatchStep[]
  backtracks: number
  totalSteps: number
  duration: number
}

export interface RegexTemplate {
  name: string
  pattern: string
  description: string
  testString: string
  category: string
}

export interface ASTNode {
  type: 'char' | 'star' | 'plus' | 'question' | 'or' | 'concat' | 'group' | 'dot' | 'anchor' | 'charclass' | 'digit' | 'word' | 'space'
  value?: string
  children?: ASTNode[]
  groupIndex?: number
}

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface RiskSource {
  type: 'nested_quantifier' | 'overlapping_alternation' | 'adjacent_repeating' | 'greedy_with_backtrack' | 'wide_charclass'
  description: string
  pattern: string
  position: number
  suggestion: string
  badExample: string
  goodExample: string
}

export interface ComplexityEstimate {
  riskLevel: RiskLevel
  estimatedComplexity: string
  riskSources: RiskSource[]
  maxBacktrackPotential: number
  warning: string | null
}
