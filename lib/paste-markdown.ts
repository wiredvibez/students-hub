const BLOCK_TAGS = new Set([
  "p",
  "div",
  "li",
  "tr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function isBoldElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  const styleAttr = el.getAttribute("style") ?? "";
  const styleWeight = el.style?.fontWeight ?? "";

  const hasNormalOverride =
    /font-weight\s*:\s*normal/i.test(styleAttr) ||
    /font-weight\s*:\s*normal/i.test(styleWeight) ||
    /mso-bidi-font-weight\s*:\s*normal/i.test(styleAttr);

  if (hasNormalOverride) return false;

  if (tag === "b" || tag === "strong") return true;

  if (/^(bold|[6-9]00)$/.test(styleWeight)) return true;
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(styleAttr)) return true;
  if (/mso-bidi-font-weight\s*:\s*bold/i.test(styleAttr)) return true;

  return false;
}

function walkNode(node: Node, parts: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.textContent ?? "");
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") {
    parts.push("\n");
    return;
  }

  const isBlock = BLOCK_TAGS.has(tag);
  if (isBlock && parts.length > 0 && !parts[parts.length - 1]?.endsWith("\n")) {
    parts.push("\n");
  }

  const childParts: string[] = [];
  for (const child of Array.from(el.childNodes)) {
    walkNode(child, childParts);
  }

  let content = childParts.join("");
  if (isBoldElement(el) && content.trim()) {
    content = `**${content}**`;
  }

  parts.push(content);

  if (isBlock && !content.endsWith("\n")) {
    parts.push("\n");
  }
}

/**
 * Converts clipboard HTML (e.g. from Word) into plain text with **bold** markers.
 * Returns null when there is no HTML or no bold formatting to preserve.
 */
export function convertRichPasteToMarkdown(
  html: string,
  plainText: string
): string | null {
  if (!html.trim()) return null;

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const parts: string[] = [];
    for (const child of Array.from(doc.body.childNodes)) {
      walkNode(child, parts);
    }

    const converted = parts
      .join("")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!converted.includes("**")) return null;
    if (converted === plainText.trim()) return null;

    return converted;
  } catch {
    return null;
  }
}
