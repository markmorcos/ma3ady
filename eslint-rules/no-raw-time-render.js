/**
 * `no-raw-time-render` — flags raw timestamp / Date rendering inside <Text> children.
 *
 * Catches:
 *   <Text>{appointment.starts_at}</Text>           // identifier-shaped timestamp
 *   <Text>{date.toLocaleString(...)}</Text>
 *   <Text>{date.toISOString()}</Text>
 *   <Text>{format(date, ...)}</Text>               // date-fns format()
 *   <Text>{formatInTimeZone(date, ...)}</Text>     // date-fns-tz formatInTimeZone()
 *
 * Suggests the canonical replacement: <Time value={...} context="..." /> or
 * <DateRange start={...} end={...} context="..." />.
 *
 * Rationale: every timestamp must flow through `useDisplayTimezone()`. Direct
 * formatting bypasses tenant TZ resolution and ships UTC to the user.
 */

const TIME_LIKE_NAME = /^(starts_at|ends_at|created_at|updated_at|.*_at|.*Time|.*Date)$/;
const TIME_FORMAT_FNS = new Set(['format', 'formatInTimeZone', 'toZonedTime', 'fromZonedTime']);
const DATE_INSTANCE_METHODS = new Set([
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
  'toISOString',
  'toUTCString',
  'toString',
]);

function isTextElement(node) {
  return (
    node?.type === 'JSXElement' &&
    node.openingElement?.name?.type === 'JSXIdentifier' &&
    node.openingElement.name.name === 'Text'
  );
}

function isSuspiciousExpression(expr) {
  if (!expr) return false;
  if (expr.type === 'Identifier' && TIME_LIKE_NAME.test(expr.name)) return true;
  if (expr.type === 'MemberExpression') {
    const prop = expr.property;
    if (prop?.type === 'Identifier' && TIME_LIKE_NAME.test(prop.name)) return true;
  }
  if (expr.type === 'CallExpression') {
    const callee = expr.callee;
    if (callee?.type === 'Identifier' && TIME_FORMAT_FNS.has(callee.name)) return true;
    if (
      callee?.type === 'MemberExpression' &&
      callee.property?.type === 'Identifier' &&
      DATE_INSTANCE_METHODS.has(callee.property.name)
    ) {
      return true;
    }
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow rendering raw Date / timestamp values in <Text>; use <Time> / <DateRange> so display timezone is resolved consistently',
    },
    schema: [],
    messages: {
      raw: 'Raw timestamp rendered in <Text>. Use <Time value={...} context="..." /> so the display timezone is resolved through useDisplayTimezone().',
    },
  },
  create(context) {
    return {
      JSXExpressionContainer(node) {
        const parent = node.parent;
        if (!isTextElement(parent)) return;
        if (isSuspiciousExpression(node.expression)) {
          context.report({ node, messageId: 'raw' });
        }
      },
    };
  },
};
