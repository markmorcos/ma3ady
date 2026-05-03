/**
 * `no-literal-string` — flags multi-word user-visible string literals.
 *
 * Catches:
 *   <Text>Hello world</Text>
 *   <Pressable accessibilityLabel="Save changes" />
 *   <Pressable accessibilityHint="This deletes the booking" />
 *
 * Allows (single words and obvious non-strings):
 *   <Text>{t('common.cancel')}</Text>
 *   <Text>OK</Text>
 *   <Text>{count}</Text>
 *
 * Rationale: every user-visible string should flow through `t(...)` so it can be
 * translated. The "multi-word" heuristic intentionally lets through one-word
 * exclamations / glyphs / numerals during prototyping; lint will still catch
 * any phrase.
 */

const A11Y_PROPS = new Set(['accessibilityLabel', 'accessibilityHint', 'aria-label']);

function isMultiWord(s) {
  if (typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (trimmed.length === 0) return false;
  return /\s/.test(trimmed);
}

function isTextElement(node) {
  return (
    node?.type === 'JSXElement' &&
    node.openingElement?.name?.type === 'JSXIdentifier' &&
    node.openingElement.name.name === 'Text'
  );
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow multi-word user-visible string literals; require translation via t(...)',
    },
    schema: [],
    messages: {
      child:
        'Multi-word literal in <Text>. Wrap in t(\'…\') so it can be translated. (Single words and numerals are fine.)',
      a11y:
        'Multi-word literal in {{prop}}. Wrap in t(\'…\').',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (!isTextElement(node.parent)) return;
        if (isMultiWord(node.value)) {
          context.report({ node, messageId: 'child' });
        }
      },
      JSXAttribute(node) {
        const name = node.name?.name;
        if (typeof name !== 'string' || !A11Y_PROPS.has(name)) return;
        const value = node.value;
        if (!value) return;
        if (value.type === 'Literal' && typeof value.value === 'string' && isMultiWord(value.value)) {
          context.report({ node, messageId: 'a11y', data: { prop: name } });
        }
        if (
          value.type === 'JSXExpressionContainer' &&
          value.expression?.type === 'Literal' &&
          typeof value.expression.value === 'string' &&
          isMultiWord(value.expression.value)
        ) {
          context.report({ node, messageId: 'a11y', data: { prop: name } });
        }
      },
    };
  },
};
