import { describe, expect, it } from "vitest";
import { normalizeDoc } from "../schema";
import { htmlToWriting } from "./html";

const body = (html: string) => htmlToWriting(html).body.content;

describe("htmlToWriting", () => {
  it("takes a leading h1 as the title and keeps the rest as body", () => {
    const result = htmlToWriting("<h1>Bus Lanes</h1><p>They work.</p>");
    expect(result.title).toBe("Bus Lanes");
    expect(result.body).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "They work." }] }],
    });
  });

  it("falls back to the <title> element, and has no title otherwise", () => {
    expect(htmlToWriting("<title> Page </title><p>x</p>").title).toBe("Page");
    expect(htmlToWriting("<p>x</p>").title).toBeNull();
  });

  it("maps bold, italic and web links to marks, dropping unsafe links", () => {
    expect(body('<p><b>a</b> <em>b</em> <a href="https://x.org">c</a> <a href="javascript:x">d</a></p>')).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "a", marks: [{ type: "bold" }] },
          { type: "text", text: " " },
          { type: "text", text: "b", marks: [{ type: "italic" }] },
          { type: "text", text: " " },
          { type: "text", text: "c", marks: [{ type: "link", attrs: { href: "https://x.org" } }] },
          { type: "text", text: " d" },
        ],
      },
    ]);
  });

  it("folds heading levels onto H2 and H3", () => {
    const levels = body("<p>intro</p><h1>a</h1><h2>b</h2><h3>c</h3><h5>d</h5>")!
      .filter((n) => (n as { type: string }).type === "heading")
      .map((n) => (n as { attrs: { level: number } }).attrs.level);
    expect(levels).toEqual([2, 2, 3, 3]);
  });

  it("keeps lists, nested lists and blockquotes as structure", () => {
    const result = htmlToWriting(
      "<ul><li>one<ul><li>inner</li></ul></li><li><p>two</p></li></ul><ol><li>first</li></ol><blockquote><p>quoted</p></blockquote>",
    );
    expect(result.body.content!.map((n) => (n as { type: string }).type)).toEqual([
      "bulletList", "orderedList", "blockquote",
    ]);
    expect(() => normalizeDoc(result.body)).not.toThrow();
  });

  it("lifts images out of paragraphs and uses a figcaption as alt text", () => {
    const result = htmlToWriting(
      '<p>before <img src="https://img.test/a.jpg" alt="A"> after</p>' +
        '<figure><img src="https://img.test/b.jpg" alt="ignored"><figcaption>The <b>harbor</b> at dawn</figcaption></figure>' +
        '<img src="data:image/png;base64,xx"><img src="local.png">',
    );
    expect(result.body.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "before" }] },
      { type: "image", attrs: { src: "https://img.test/a.jpg", alt: "A" } },
      { type: "paragraph", content: [{ type: "text", text: "after" }] },
      { type: "image", attrs: { src: "https://img.test/b.jpg", alt: "The harbor at dawn" } },
    ]);
  });

  it("collapses whitespace, keeps <br> and drops scripts, styles and empties", () => {
    expect(body("<style>p{}</style><script>alert(1)</script><p>  a \n  b<br>  c  </p><p> </p>")).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "a b" }, { type: "hardBreak" }, { type: "text", text: "c" }],
      },
    ]);
  });

  it("wraps loose text in paragraphs and keeps <pre> line breaks", () => {
    expect(body("<div>loose <i>text</i><pre>x\ny\n</pre></div>")).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "loose " }, { type: "text", text: "text", marks: [{ type: "italic" }] }] },
      { type: "paragraph", content: [{ type: "text", text: "x" }, { type: "hardBreak" }, { type: "text", text: "y" }] },
    ]);
  });

  it("returns a valid one-paragraph document for empty input", () => {
    expect(htmlToWriting("")).toEqual({ title: null, body: { type: "doc", content: [{ type: "paragraph" }] } });
  });

  it("always produces documents the editor schema accepts", () => {
    const messy =
      "<h1>T</h1><table><tr><td>cell <b>one</b></td><td>two</td></tr></table>" +
      "<ul><li><img src='https://i.test/x.png'></li></ul><blockquote>bare</blockquote><h4></h4><hr>";
    expect(() => normalizeDoc(htmlToWriting(messy).body)).not.toThrow();
  });
});
