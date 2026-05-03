/**
 * `no-inline-hex` — flag inline hex color literals in style objects.
 *
 * The existing `no-restricted-syntax` rule (eslint.config.js) catches every
 * `#abc` / `#aabbcc` / `#aabbccdd` literal across .ts/.tsx. This rule promotes
 * that to a proper plugin rule so the message can suggest `@/design/tokens`.
 *
 * Catches:
 *   StyleSheet.create({ row: { color: '#0F766E' } })
 *   <View style={{ backgroundColor: '#FFFFFF' }} />
 *   const style = { color: `#${hex}` }
 *
 * Allowed (out of scope):
 *   `#0F766E10` inside src/design/** (the token source itself)
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const HEX_IN_TEMPLATE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow inline hex color literals; import from @/design/tokens instead',
    },
    schema: [],
    messages: {
      hex: 'Inline hex color {{value}} is not allowed. Import a token from @/design/tokens (or use useTheme().colors.*).',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!HEX.test(node.value)) return;
        context.report({ node, messageId: 'hex', data: { value: node.value } });
      },
      TemplateElement(node) {
        const raw = node.value?.raw ?? '';
        const m = HEX_IN_TEMPLATE.exec(raw);
        if (!m) return;
        context.report({ node, messageId: 'hex', data: { value: m[0] } });
      },
    };
  },
};
