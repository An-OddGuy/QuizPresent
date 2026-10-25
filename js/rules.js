// node = student record merged with grade { score, verified }; th = { c, r }; over = true/false/null
export function evaluate(node, th, over) {
  if (node.score === undefined) return null;
  const need = node.mode === "in" ? th.c : th.r;
  let ok = node.score >= need;
  if (node.mode === "rem" && node.disqualified) ok = false;
  if (node.mode === "in" && node.verified === false) ok = false;
  const overridden = over === true || over === false;
  return { ok: overridden ? over : ok, need, overridden };
}

// A grade only counts if it belongs to THIS attempt (stamped with the submission / join time).
export function fresh(s, g) {
  g = g || {};
  return {
    score: g.at === s.submittedAt ? g.score : undefined,
    verified: g.vat === s.joinedAt ? g.verified : undefined
  };
}
