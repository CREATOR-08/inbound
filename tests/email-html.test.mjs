import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  getSafeEmailImageUrl,
  sanitizeEmailHtml,
} from "../lib/email-html.ts";

test("email images only load remotely after explicit HTTPS opt-in", () => {
  assert.equal(
    getSafeEmailImageUrl("https://images.example.com/message.png"),
    null,
  );
  assert.equal(
    getSafeEmailImageUrl("https://images.example.com/message.png", true),
    "https://images.example.com/message.png",
  );
});

test("email image URL validation keeps safe inline images and rejects active or insecure sources", () => {
  assert.equal(
    getSafeEmailImageUrl("data:image/png;base64,AAAA"),
    "data:image/png;base64,AAAA",
  );
  assert.equal(getSafeEmailImageUrl("cid:logo@example.com", true), null);
  assert.equal(getSafeEmailImageUrl("http://images.example.com/a.png", true), null);
  assert.equal(
    getSafeEmailImageUrl("https://user:password@images.example.com/a.png", true),
    null,
  );
  assert.equal(
    getSafeEmailImageUrl("data:image/svg+xml;base64,PHN2Zz4=", true),
    null,
  );
});

test("email HTML removes active content and preserves safe formatting with image fallbacks", () => {
  const { window } = new JSDOM("");
  const originalDOMParser = globalThis.DOMParser;
  globalThis.DOMParser = window.DOMParser;

  try {
    const result = sanitizeEmailHtml(
      '<style>.message { color: red; background-image: url("https://track.example/pixel") }</style>' +
        '<p class="message" style="color: blue; position: fixed" onclick="alert(1)">Safe text</p>' +
        '<script>alert(1)</script><iframe src="https://attacker.example"></iframe>' +
        '<a href="javascript:alert(1)">unsafe link</a>' +
        '<img src="cid:logo@example.com" alt="Logo">' +
        '<img src="https://images.example.com/photo.png" alt="Photo">',
    );

    assert.match(result.html, /Safe text/);
    assert.match(result.html, /color: blue/);
    assert.doesNotMatch(result.html, /<script|<iframe|onclick|javascript:/i);
    assert.doesNotMatch(result.html, /background-image|track\.example/);
    assert.match(result.html, /Logo/);
    assert.match(result.html, /Photo/);
    assert.doesNotMatch(result.html, /src="cid:|src="https:/i);
    assert.equal(result.remoteImageCount, 1);
  } finally {
    globalThis.DOMParser = originalDOMParser;
    window.close();
  }
});
