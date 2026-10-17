import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// Markdown renderer for the preview: CommonMark + GitHub extras
// (tables, strikethrough, task lists, footnotes, autolinks) with code highlighting
export default (function () {
    const languages = { bash, c, cpp, csharp, css, go, java, javascript, json, kotlin, markdown, php, python, ruby, rust, sql, swift, typescript, xml, yaml };

    Object.keys(languages).forEach((name) => hljs.registerLanguage(name, languages[name]));
    hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
    hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
    hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
    hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
    hljs.registerAliases(['py'], { languageName: 'python' });
    hljs.registerAliases(['yml'], { languageName: 'yaml' });
    hljs.registerAliases(['md'], { languageName: 'markdown' });

    const md = new MarkdownIt({
        html: false,        // raw HTML in the text is shown as text, never run
        linkify: true,
        breaks: true,       // a single newline is a line break, as people expect from a notepad
        highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
            }

            return '';
        },
    })
        .use(taskLists, { enabled: true })   // the boxes can be clicked; ui.js writes the tick into the text
        .use(footnote);

    // Links open in a new tab so the text being written is not lost
    const renderToken = (tokens, index, options, env, self) => self.renderToken(tokens, index, options);
    const linkOpen = md.renderer.rules.link_open || renderToken;

    md.renderer.rules.link_open = (tokens, index, options, env, self) => {
        tokens[index].attrSet('target', '_blank');
        tokens[index].attrSet('rel', 'noopener');

        return linkOpen(tokens, index, options, env, self);
    };

    // A picture by its address (![caption](https://…)) is fetched from that address
    // when the preview shows it: the only request the page makes on the writer's
    // behalf. It is fetched lazily and without a referrer, so the host learns
    // nothing but that someone wanted the picture.
    const image = md.renderer.rules.image;

    md.renderer.rules.image = (tokens, index, options, env, self) => {
        tokens[index].attrSet('loading', 'lazy');
        tokens[index].attrSet('referrerpolicy', 'no-referrer');

        return image(tokens, index, options, env, self);
    };

    // A code block carries the word "copy" in its corner (ui.js handles the click)
    const fence = md.renderer.rules.fence;

    md.renderer.rules.fence = (...args) => `<div class="code-block"><button class="copy" type="button" data-hint="copy this block">copy</button>${fence(...args)}</div>`;

    // A frontmatter block (--- at the very top, --- again) is shown as a muted
    // key–value block instead of a rule and stray text
    function render(text) {
        const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);

        if (!match) {
            return md.render(text);
        }

        const escape = value => value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const rows = match[1].split(/\r?\n/).map((line) => {
            const pair = /^([^:]+):\s*(.*)$/.exec(line);

            return pair
                ? `<div><dt>${escape(pair[1].trim())}</dt><dd>${escape(pair[2])}</dd></div>`
                : `<div><dd>${escape(line)}</dd></div>`;
        }).join('');

        return `<dl class="frontmatter">${rows}</dl>${md.render(text.slice(match[0].length))}`;
    }

    return {
        render,
    }
})();
