import { describe, test, expect } from '@jest/globals';
import { toValeAST } from '../bin/lib.js';

// =============================================================================
// DEFAULT BEHAVIOR (No Framework Import)
// =============================================================================

describe('Default Behavior (No Framework Import)', () => {
  test('multiline JSX wraps in pre/code', () => {
    const mdx = `
<SomeComponent prop="value">
  Content here
</SomeComponent>`;
    const output = toValeAST(mdx);
    expect(output).toContain('<pre><code class="mdxNode mdxJsxFlowElement">');
    expect(output).toContain('&#x3C;SomeComponent');
  });

  test('single line JSX text element wraps in code', () => {
    const mdx = `<CustomComponent>content</CustomComponent>`;
    const output = toValeAST(mdx);
    expect(output).toContain('<code class="mdxNode');
    expect(output).toContain('&#x3C;CustomComponent>');
  });

  test('self-closing flow JSX wraps in pre/code', () => {
    const output = toValeAST('<Icon name="star" />');
    expect(output).toContain('<pre><code class="mdxNode');
    expect(output).toContain('&#x3C;Icon');
  });

  test('empty flow JSX element wraps in pre/code', () => {
    const output = toValeAST('<Card></Card>');
    expect(output).toContain('<pre><code class="mdxNode');
    expect(output).toContain('&#x3C;Card');
  });

  test('JSX fragment does not crash', () => {
    const mdx = `<>content</>`;
    expect(() => toValeAST(mdx)).not.toThrow();
    const output = toValeAST(mdx);
    expect(output).toBeDefined();
  });
});

// =============================================================================
// ESM AND EXPRESSIONS
// =============================================================================

describe('ESM and Expressions', () => {
  test('single-line import wraps in pre/code', () => {
    const mdx = `import { Card } from '@mintlify/components';`;
    const output = toValeAST(mdx);
    expect(output).toContain('<pre><code class="mdxNode mdxjsEsm">');
    expect(output).toContain('import');
  });

  test('single-line export wraps in pre/code', () => {
    const mdx = `export const meta = { title: "Test" };`;
    const output = toValeAST(mdx);
    expect(output).toContain('<pre><code class="mdxNode mdxjsEsm">');
  });

  test('multiline export wraps in pre/code', () => {
    const mdx = `export const meta = {
  title: "Test",
  description: "Description"
};`;
    const output = toValeAST(mdx);
    expect(output).toContain('<pre><code class="mdxNode mdxjsEsm">');
  });

  test('inline JSX expression wraps in code', () => {
    const mdx = `The value is {someVariable}.`;
    const output = toValeAST(mdx);
    expect(output).toContain('<code class="mdxNode mdxTextExpression">');
    expect(output).toContain('{someVariable}');
  });

  test('JSX comment converts to HTML comment', () => {
    const mdx = `{/* This is a comment */}`;
    const output = toValeAST(mdx);
    expect(output).toContain('<!-- This is a comment -->');
  });

  test('multiline flow expression wraps in pre/code', () => {
    const mdx = `{
  someExpression
}`;
    const output = toValeAST(mdx);
    expect(output).toContain('<pre><code class="mdxNode mdxFlowExpression">');
  });

  test('single-line flow expression wraps in pre/code', () => {
    const output = toValeAST(`{someExpression}`);
    expect(output).toContain('<pre><code class="mdxNode mdxFlowExpression">');
  });
});

// =============================================================================
// MDX NODE CLASSES
// =============================================================================

describe('MDX Node Classes', () => {
  test('JSX flow element has correct class', () => {
    const mdx = `
<Card>
  content
</Card>`;
    const output = toValeAST(mdx);
    expect(output).toContain('mdxJsxFlowElement');
  });

  test('JSX text element has correct class', () => {
    const mdx = `Inline <Icon /> here`;
    const output = toValeAST(mdx);
    expect(output).toContain('mdxJsxTextElement');
  });

  test('prose component has mdxNode class', () => {
    const mdx = `import { Card } from '@mintlify/components';

<Card>content</Card>`;
    const output = toValeAST(mdx);
    expect(output).toContain('class="mdxNode');
  });
});

// =============================================================================
// MARKDOWN PARSING
// =============================================================================

describe('Markdown Parsing', () => {
  test('handles frontmatter correctly', () => {
    const mdx = `---
title: Test
---

# Heading`;
    const output = toValeAST(mdx);
    expect(output).toContain('<h1>Heading</h1>');
  });

  test('handles math expressions', () => {
    const mdx = `The equation is $E = mc^2$`;
    const output = toValeAST(mdx);
    expect(output).toBeDefined();
  });

  test('regular markdown renders correctly', () => {
    const mdx = `# Heading 1

Regular paragraph with **bold** and *italic*.

- List item 1
- List item 2

[A link](https://example.com)`;
    const output = toValeAST(mdx);
    expect(output).toContain('<h1>Heading 1</h1>');
    expect(output).toContain('<strong>bold</strong>');
    expect(output).toContain('<em>italic</em>');
    expect(output).toContain('<ul>');
    expect(output).toContain('<a href="https://example.com">');
  });
});

// =============================================================================
// REGRESSION TESTS
// =============================================================================

describe('Regression Tests', () => {
  test('real-world changelog file pattern', () => {
    const mdx = `import { Update } from '@mintlify/components';

<Update label="10-16-2025" tags={['Android SDK']}>
  ## Android SDK 6.7.0
  
  ### What's New
  
  Version 6.7.0 of the Android SDK resolved an infinite loop error.
  
  ### Impact
  
  The SDK now properly handles 401 responses.
</Update>

<Update label="08-06-2025" tags={['Android SDK']}>
  ## Android SDK 6.5.1
  
  Removed the cryptographic key warning.
</Update>`;
    const output = toValeAST(mdx);
    expect(output).toContain('data-component="Update"');
    expect(output).toContain('<h2>Android SDK 6.7.0</h2>');
    expect(output).toContain('<h3>');
    expect(output).not.toContain('&#x3C;Update');
  });

  test('mixed markdown and JSX components', () => {
    const mdx = `import { Note } from '@mintlify/components';

# Regular Heading

Regular paragraph.

<Note>Important note</Note>

Another paragraph.`;
    
    const output = toValeAST(mdx);
    expect(output).toContain('<h1>Regular Heading</h1>');
    expect(output).toContain('<p>Regular paragraph.</p>');
    expect(output).toContain('data-component="Note"');
    expect(output).toContain('<p>Another paragraph.</p>');
  });

  test('inline JSX in paragraph uses text element handling', () => {
    const mdx = `import { Icon } from '@mintlify/components';

This is a paragraph with an <Icon name="star" /> inline.`;
    const output = toValeAST(mdx);
    expect(output).toContain('<code class="mdxNode mdxJsxTextElement">');
    expect(output).toContain('&#x3C;Icon');
  });
});
