import { mdxjs } from "micromark-extension-mdxjs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mathFromMarkdown } from "mdast-util-math";
import { math } from "micromark-extension-math";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toHast } from "mdast-util-to-hast";
import { h } from "hastscript";
import { toHtml } from "hast-util-to-html";

const mdxNodes = [
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxJsxFlowElement",
  "mdxJsxTextElement",
  "mdxTextExpression",
];

const flowNodes = new Set([
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxJsxFlowElement",
]);

/**
 * Framework configurations for prose component detection.
 * Key order determines auto-detection priority: Starlight > Fern > Mintlify
 * @type {Record<string, {pattern: RegExp, components: Set<string>}>}
 */
const FRAMEWORKS = {
  starlight: {
    pattern: /@astrojs\//,
    components: new Set([
      "Aside", "Card", "CardGrid", "LinkCard",
      "Steps", "Tabs", "TabItem", "FileTree",
    ]),
  },
  fern: {
    pattern: /@fern-ui\//,
    components: new Set([
      "Info", "Warning", "Success", "Error", "Note", "Launch", "Tip", "Check",
      "Accordion", "AccordionGroup", "Aside", "Card", "Frame",
      "Steps", "Step", "Tabs", "Tab",
      "Tooltip", "Indent", "ParamField",
    ]),
  },
  mintlify: {
    pattern: /@mintlify\//,
    components: new Set([
      "Note", "Warning", "Info", "Tip", "Check", "Callout",
      "Card", "CardGroup", "Accordion", "AccordionGroup", "Expandable",
      "Columns", "Column", "Frame", "Steps", "Step", "Tabs", "Tab",
      "Tooltip", "ParamField", "ResponseField", "Param", "Update",
      "Aside", "Definition",
    ]),
  },
};

/**
 * @param {string} doc
 * @returns {Set<string> | null}
 */
const getProseComponents = (doc) => {
  const envFramework = process.env.MDX2VAST_FRAMEWORK?.toLowerCase();
  if (envFramework && Object.hasOwn(FRAMEWORKS, envFramework)) {
    return FRAMEWORKS[envFramework].components;
  }
  for (const { pattern, components } of Object.values(FRAMEWORKS)) {
    if (pattern.test(doc)) return components;
  }
  return null;
};

/**
 * @param {string} source
 * @returns {boolean}
 */
const isComment = (source) => source.startsWith("{/*") && source.endsWith("*/}");

/**
 * @param {string} doc
 * @returns {Function}
 */
const createCustomHandler = (doc) => (state, node, parent) => {
  const source = doc.slice(node.position.start.offset, node.position.end.offset);

  if (node.type === "mdxFlowExpression" && isComment(source)) {
    return { type: "comment", value: source.slice(3, -3) };
  }

  if (mdxNodes.includes(node.type)) {
    const className = `mdxNode ${node.type}`;
    return source.includes("\n") || flowNodes.has(node.type)
      ? h("pre", h("code", { className }, source))
      : h("code", { className }, source);
  }

  return null;
};

/**
 * Creates a JSX handler with support for Mintlify, Starlight, and Fern frameworks.
 * Detects framework via import patterns and converts prose component children to HTML.
 * @param {string} doc
 * @returns {Function}
 */
const createJsxHandler = (doc) => {
  const proseComponents = getProseComponents(doc);

  return (state, node) => {
    const source = doc.slice(node.position.start.offset, node.position.end.offset);
    const { name, children } = node;
    const className = `mdxNode ${node.type}`;
    const hasChildren = children && children.length > 0;

    if (proseComponents && hasChildren && proseComponents.has(name)) {
      return h("div", { className, "data-component": name }, state.all(node));
    }

    return source.includes("\n") || flowNodes.has(node.type)
      ? h("pre", h("code", { className }, source))
      : h("code", { className }, source);
  };
};

/**
 * Converts MDX content to HTML suitable for Vale linting.
 * Detects documentation frameworks (Mintlify, Starlight, Fern) via import patterns
 * and converts prose component children to HTML for Vale analysis.
 * @param {string} doc - The MDX document content
 * @returns {string} HTML output suitable for Vale
 */
const toValeAST = (doc) => {
  const mdast = fromMarkdown(doc, {
    extensions: [mdxjs(), math(), gfm()],
    mdastExtensions: [mdxFromMarkdown(), mathFromMarkdown(), gfmFromMarkdown()],
  });

  const customHandler = createCustomHandler(doc);
  const jsxHandler = createJsxHandler(doc);

  const hast = toHast(mdast, {
    allowDangerousHtml: true,
    passThrough: mdxNodes,
    handlers: {
      mdxjsEsm: customHandler,
      mdxFlowExpression: customHandler,
      mdxTextExpression: customHandler,
      mdxJsxFlowElement: jsxHandler,
      mdxJsxTextElement: jsxHandler,
    },
  });

  return toHtml(hast);
};

export { toValeAST };
