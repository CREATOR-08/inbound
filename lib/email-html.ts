const allowedStyles = new Set([
  "background-color",
  "border",
  "border-collapse",
  "border-color",
  "border-spacing",
  "border-style",
  "border-width",
  "color",
  "display",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-indent",
  "text-transform",
  "vertical-align",
  "white-space",
  "width",
]);

const isSafeCssValue = (value: string) =>
  !/(?:url\s*\(|expression\s*\(|javascript\s*:)/i.test(value);

const getSafeDeclarations = (style: CSSStyleDeclaration) =>
  Array.from(style)
    .filter((property) => allowedStyles.has(property))
    .map((property) => [property, style.getPropertyValue(property)] as const)
    .filter(([, value]) => isSafeCssValue(value))
    .map(([property, value]) => `${property}: ${value}`);

const sanitizeStyleSheetRules = (rules: CSSRuleList): string[] => {
  const safeRules: string[] = [];

  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.STYLE_RULE) {
      const styleRule = rule as CSSStyleRule;
      const declarations = getSafeDeclarations(styleRule.style);
      if (declarations.length > 0) {
        safeRules.push(`${styleRule.selectorText} { ${declarations.join("; ")} }`);
      }
    } else if (
      rule.type === CSSRule.MEDIA_RULE ||
      rule.type === CSSRule.SUPPORTS_RULE
    ) {
      const groupingRule = rule as CSSGroupingRule & { conditionText: string };
      const nestedRules = sanitizeStyleSheetRules(groupingRule.cssRules);
      if (nestedRules.length > 0) {
        const name = rule.type === CSSRule.MEDIA_RULE ? "media" : "supports";
        safeRules.push(
          `@${name} ${groupingRule.conditionText} { ${nestedRules.join(" ")} }`,
        );
      }
    }
  }

  return safeRules;
};

export const getSafeEmailImageUrl = (
  source: string,
  allowRemoteImages = false,
) => {
  const trimmedSource = source.trim();
  if (/^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(trimmedSource)) {
    return trimmedSource;
  }
  if (!allowRemoteImages) return null;

  try {
    const url = new URL(trimmedSource);
    if (
      url.protocol === "https:" &&
      url.hostname &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
};

export interface SanitizedEmailHtml {
  html: string;
  remoteImageCount: number;
}

export const sanitizeEmailHtml = (
  html: string,
  allowRemoteImages = false,
): SanitizedEmailHtml => {
  const document = new DOMParser().parseFromString(html, "text/html");
  let remoteImageCount = 0;
  const safeStyleElements: HTMLStyleElement[] = [];

  document.querySelectorAll("style").forEach((styleElement) => {
    try {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(styleElement.textContent || "");
      const safeRules = sanitizeStyleSheetRules(styleSheet.cssRules);
      if (safeRules.length > 0) {
        styleElement.textContent = safeRules.join("\n");
        safeStyleElements.push(styleElement);
      } else {
        styleElement.remove();
      }
    } catch {
      styleElement.remove();
    }
  });

  document
    .querySelectorAll(
      "script,iframe,frame,object,embed,form,input,button,select,option,textarea,link,meta,base,video,audio,source,svg,math",
    )
    .forEach((element) => element.remove());
  document.body.append(...safeStyleElements);

  document.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "srcset" || name === "background") {
        element.removeAttribute(attribute.name);
      } else if (name === "style") {
        const parsedStyle = document.createElement("span");
        parsedStyle.setAttribute("style", value);
        const safeDeclarations = getSafeDeclarations(parsedStyle.style);
        if (safeDeclarations.length > 0) {
          element.setAttribute("style", safeDeclarations.join("; "));
        } else {
          element.removeAttribute("style");
        }
      } else if (name !== "href" && name.endsWith("href")) {
        element.removeAttribute(attribute.name);
      } else if (name === "href" && !/^(https?:|mailto:|#)/i.test(value)) {
        element.removeAttribute(attribute.name);
      } else if (name === "src") {
        if (element.tagName.toLowerCase() !== "img") {
          element.removeAttribute(attribute.name);
        } else {
          const safeUrl = getSafeEmailImageUrl(value, allowRemoteImages);
          if (/^https:/i.test(value)) remoteImageCount += 1;
          if (safeUrl) {
            element.setAttribute(attribute.name, safeUrl);
          } else {
            element.removeAttribute(attribute.name);
          }
        }
      }
    }
  });

  document.body.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.removeAttribute("target");
    if (/^https?:/i.test(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
  document.body.querySelectorAll("img").forEach((image) => {
    if (!image.hasAttribute("src")) {
      const fallback = document.createElement("span");
      fallback.className = "email-image-fallback";
      fallback.textContent = image.getAttribute("alt")?.trim() || "Image unavailable";
      image.replaceWith(fallback);
    }
  });

  return { html: document.body.innerHTML, remoteImageCount };
};
