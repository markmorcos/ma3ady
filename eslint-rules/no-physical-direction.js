/**
 * `no-physical-direction` — flag `left`/`right` style keys; require `start`/`end`.
 *
 * Catches:
 *   StyleSheet.create({ row: { marginLeft: 8 } })
 *   <View style={{ paddingRight: 12 }} />
 *   const s = { left: 0 }      // when used as a style key
 *
 * Out of scope:
 *   - `text-align: 'left'` value strings (those are handled by RN's RTL by default,
 *     and authors using them deliberately are signalling intent).
 *   - SVG / lucide / non-style code.
 *
 * Heuristic: the rule fires on any object property whose key starts with `left`,
 * `right`, `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `borderLeft*`,
 * `borderRight*`. Combined with the `style` / `StyleSheet.create` context, this
 * catches the common mistakes without false-positives on unrelated keys.
 */

const PHYSICAL_KEYS = new Set([
  'left',
  'right',
  'marginLeft',
  'marginRight',
  'paddingLeft',
  'paddingRight',
  'borderLeftWidth',
  'borderRightWidth',
  'borderLeftColor',
  'borderRightColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
]);

const REPLACEMENT = {
  left: 'start',
  right: 'end',
  marginLeft: 'marginStart',
  marginRight: 'marginEnd',
  paddingLeft: 'paddingStart',
  paddingRight: 'paddingEnd',
  borderLeftWidth: 'borderStartWidth',
  borderRightWidth: 'borderEndWidth',
  borderLeftColor: 'borderStartColor',
  borderRightColor: 'borderEndColor',
  borderTopLeftRadius: 'borderTopStartRadius',
  borderTopRightRadius: 'borderTopEndRadius',
  borderBottomLeftRadius: 'borderBottomStartRadius',
  borderBottomRightRadius: 'borderBottomEndRadius',
};

function isStyleContext(node) {
  // Walk up looking for a JSX `style={{ ... }}` attribute or a `StyleSheet.create({ ... })` call.
  let cur = node.parent;
  while (cur) {
    if (cur.type === 'JSXAttribute' && cur.name?.name === 'style') return true;
    if (
      cur.type === 'CallExpression' &&
      cur.callee?.type === 'MemberExpression' &&
      cur.callee.object?.name === 'StyleSheet' &&
      cur.callee.property?.name === 'create'
    ) {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow physical-direction style keys (left/right); require logical start/end for RTL correctness',
    },
    schema: [],
    messages: {
      physical:
        'Physical-direction style key "{{key}}" breaks RTL. Use "{{replacement}}" instead.',
    },
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key?.type === 'Identifier' ? node.key.name : null;
        if (!key || !PHYSICAL_KEYS.has(key)) return;
        if (!isStyleContext(node)) return;
        context.report({
          node: node.key,
          messageId: 'physical',
          data: { key, replacement: REPLACEMENT[key] ?? '(logical equivalent)' },
        });
      },
    };
  },
};
