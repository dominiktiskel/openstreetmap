const crypto = require('crypto');

// Elasticsearch rejects _id values longer than 512 bytes and then the whole
// bulk batch is dropped. Pelias stores source:layer:source_id in _id.
const ES_ID_MAX_BYTES = 512;

/**
 * OSM sometimes stores the same street name concatenated many times
 * ("вулиця капітана шаповалавулиця капітана шаповала...").
 * Return a single copy when the whole string is that phrase repeated.
 */
function collapseRepeatedPhrase(name) {
  const text = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
  if (text.length < 2) return text;

  const squashed = text.replace(/ /g, '');
  for (let len = 1; len <= squashed.length / 2; len++) {
    if (squashed.length % len !== 0) continue;
    const times = squashed.length / len;
    if (times < 2) continue;
    const unit = squashed.slice(0, len);
    if (unit.repeat(times) !== squashed) continue;

    let consumed = 0;
    let end = 0;
    for (; end < text.length && consumed < len; end++) {
      if (text[end] !== ' ') consumed++;
    }
    const spaced = text.slice(0, end).trim();
    if (spaced.replace(/ /g, '') === unit) return spaced;
    return unit;
  }
  return text;
}

function gidPrefixBytes(layer) {
  return Buffer.byteLength(`openstreetmap:${layer}:`, 'utf8');
}

function truncateUtf8(str, maxBytes) {
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= maxBytes) return str;
  let end = maxBytes;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
  return buf.subarray(0, end).toString('utf8');
}

/**
 * Keep source:layer:id within the Elasticsearch _id limit.
 * Ids that already fit are returned unchanged, so existing documents stay stable.
 */
function fitSourceId(layer, id) {
  const value = String(id);
  const max = ES_ID_MAX_BYTES - gidPrefixBytes(layer);
  if (Buffer.byteLength(value, 'utf8') <= max) return { id: value, truncated: false };

  const hash = crypto.createHash('sha1').update(value).digest('hex');
  const marker = `_${hash}`;
  const budget = max - Buffer.byteLength(marker, 'utf8');
  return { id: truncateUtf8(value, budget) + marker, truncated: true };
}

module.exports = {
  ES_ID_MAX_BYTES,
  collapseRepeatedPhrase,
  fitSourceId
};
