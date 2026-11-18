// Code audit: measures the repository against the style guide (plan section 10) and prints a
// report. Read-only; exits 1 when an "error" finding exists so CI can use it.
// Depends on espree (ships with ESLint) for parsing. Usage: npm run audit [-- --json]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import * as espree from 'espree';

const ROOT = new URL('..', import.meta.url).pathname;
const CODE_DIRS = ['src', 'scripts'];
const SKIP = new Set(['node_modules', '.git', 'content']);
const MAX_FUNCTION_LINES = 30; // Rule 5
const SELF_EXPLAINING_LINES = 3; // Shorter named helpers need no comment (rule 1 names them)
const DUPLICATE_WINDOW = 8; // Lines that must repeat exactly to count as copy-paste
const MAX_DOC_LINES = 300; // Beyond this a doc is hard to navigate on a phone
// Inline styles are allowed only for CSS variables fed from data and drag positions.
const STATIC_STYLE = /style=["](?!--)|\.style\.(?!(top|left|height|width|setProperty)\b)\w+\s*=/;
const LEFTOVER_NOTE = new RegExp(['TO', 'DO|FIX', 'ME'].join(''));

/** Lists files under a directory, recursively, skipping generated and vendored folders. */
function listFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Parses a JS file into an AST with comments and line numbers; null if it does not parse. */
function parse(source) {
  try {
    return espree.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      loc: true,
      comment: true,
    });
  } catch {
    return null; // Reported by ESLint already; the audit just skips the file.
  }
}

/** Returns top-level and nested functions with a name, start line and line count. */
function collectFunctions(ast) {
  const found = [];
  const visit = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    const isFunction = /Function(Declaration|Expression)$|ArrowFunctionExpression/.test(node.type);
    if (isFunction) {
      const name =
        node.id?.name ??
        (parent?.type === 'VariableDeclarator' ? parent.id.name : null) ??
        (parent?.type === 'Property' || parent?.type === 'MethodDefinition'
          ? parent.key.name
          : null);
      const topLevel = parent?.type === 'Program' || parent?.type === 'VariableDeclarator';
      found.push({ name, node, topLevel, lines: node.loc.end.line - node.loc.start.line + 1 });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => visit(child, node));
      else if (value && typeof value.type === 'string') visit(value, node);
    }
  };
  visit(ast, null);
  return found;
}

/** True when a comment ends on the line before `line` (or the line before its `export`). */
function hasCommentAbove(commentEndLines, line) {
  return commentEndLines.has(line - 1);
}

/** Checks one JS file and returns its findings. */
function auditJsFile(path, source) {
  const findings = [];
  const add = (level, rule, line, message) => findings.push({ level, rule, path, line, message });
  const firstLine = source.split('\n').find((text) => text.trim());
  if (!/^\s*(\/\/|\/\*)/.test(firstLine ?? '')) add('error', 10, 1, 'No file header comment');

  const ast = parse(source);
  if (!ast) return findings;
  const commentEndLines = new Set(ast.comments.map((comment) => comment.loc.end.line));

  for (const fn of collectFunctions(ast)) {
    const line = fn.node.loc.start.line;
    const declarationLine = fn.topLevel ? findDeclarationLine(source, line) : line;
    const needsComment = fn.topLevel && fn.name && fn.lines > SELF_EXPLAINING_LINES;
    if (needsComment && !hasCommentAbove(commentEndLines, declarationLine)) {
      add('warn', 11, line, `Function "${fn.name}" has no comment`);
    }
    if (fn.lines > MAX_FUNCTION_LINES && fn.name) {
      add('warn', 5, line, `Function "${fn.name}" is ${fn.lines} lines`);
    }
  }
  source.split('\n').forEach((text, index) => {
    if (/catch\s*(\(\w*\))?\s*\{\s*\}/.test(text)) add('error', 14, index + 1, 'Empty catch');
    if (STATIC_STYLE.test(text)) add('warn', 3, index + 1, 'Style set in JS');
    if (LEFTOVER_NOTE.test(text)) add('info', 13, index + 1, 'Leftover note');
  });
  return findings;
}

/** Walks back from a function's line to its `export`/`const` line (multi-line signatures). */
function findDeclarationLine(source, line) {
  const lines = source.split('\n');
  let index = line - 1;
  while (index > 0 && !/^(export\s+)?(async\s+)?(function|const|let)\b/.test(lines[index])) {
    index -= 1;
  }
  return index + 1;
}

/** Finds blocks of DUPLICATE_WINDOW identical (trimmed) lines appearing in two places. */
function findDuplicates(files) {
  const seen = new Map();
  const findings = [];
  for (const { path, source } of files) {
    const lines = source.split('\n').map((text) => text.trim());
    for (let i = 0; i + DUPLICATE_WINDOW <= lines.length; i += 1) {
      const block = lines.slice(i, i + DUPLICATE_WINDOW);
      // Short or boilerplate lines (braces, imports) make false matches.
      if (block.filter((text) => text.length > 20 && !text.startsWith('import')).length < 6) {
        continue;
      }
      const key = createHash('sha1').update(block.join('\n')).digest('hex');
      const first = seen.get(key);
      if (!first) seen.set(key, { path, line: i + 1 });
      else if (first.path !== path || Math.abs(first.line - i - 1) >= DUPLICATE_WINDOW) {
        findings.push({
          level: 'warn',
          rule: 'dup',
          path,
          line: i + 1,
          message: `Same ${DUPLICATE_WINDOW} lines as ${relative(ROOT, first.path)}:${first.line}`,
        });
        i += DUPLICATE_WINDOW - 1; // Report a long copy once, not once per line.
      }
    }
  }
  return findings;
}

/** Lists exported names that no other file imports (dead code candidates). */
function findUnusedExports(files) {
  const everything = files.map((file) => file.source).join('\n');
  const findings = [];
  for (const { path, source } of files) {
    if (!path.includes('/src/')) continue; // Scripts are entry points.
    for (const match of source.matchAll(/^export (?:async )?(?:function|const|let) (\w+)/gm)) {
      const name = match[1];
      const uses = everything.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0;
      const ownUses = source.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0;
      if (uses === ownUses && ownUses === 1) {
        const line = source.slice(0, match.index).split('\n').length;
        findings.push({ level: 'warn', rule: 'dead', path, line, message: `"${name}" unused` });
      }
    }
  }
  return findings;
}

/** Checks Markdown docs for length and repeated paragraphs. */
function auditDocs(paths) {
  const findings = [];
  for (const path of paths) {
    const text = readFileSync(path, 'utf8');
    const lineCount = text.split('\n').length;
    if (lineCount > MAX_DOC_LINES && !path.endsWith('CHANGELOG.md')) {
      findings.push({ level: 'info', rule: 13, path, line: 1, message: `${lineCount} lines long` });
    }
    const seenLines = new Map();
    text.split('\n').forEach((line, index) => {
      const key = line.trim();
      if (key.length < 60 || key.startsWith('|')) return;
      if (seenLines.has(key)) {
        findings.push({
          level: 'warn',
          rule: 'dup',
          path,
          line: index + 1,
          message: `Repeats line ${seenLines.get(key)}`,
        });
      } else seenLines.set(key, index + 1);
    });
  }
  return findings;
}

/** Lists CSS classes that no HTML or JS file mentions (dead styles). */
function findUnusedCss(markupSources) {
  const markup = markupSources.join('\n');
  const findings = [];
  for (const path of listFiles(join(ROOT, 'styles')).filter((p) => extname(p) === '.css')) {
    const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const classes = new Set([...css.matchAll(/\.([a-z][\w-]*)/gi)].map((match) => match[1]));
    for (const name of classes) {
      // Names built in code (`indent-${level}`, `${base}--rows`) count as used by their stem.
      const stem = name.replace(/(--|-)[\w]+$/, '$1');
      const suffix = name.match(/--\w+$/)?.[0];
      const built = markup.includes(`${stem}\${`) || (suffix && markup.includes(`}${suffix}`));
      if (!markup.includes(name) && !built) {
        findings.push({ level: 'warn', rule: 'dead', path, line: 1, message: `.${name} unused` });
      }
    }
  }
  return findings;
}

/** Runs every check and prints a grouped report; returns the exit code. */
function main() {
  const codePaths = CODE_DIRS.flatMap((dir) => listFiles(join(ROOT, dir))).filter(
    (path) => extname(path) === '.js',
  );
  const files = codePaths.map((path) => ({ path, source: readFileSync(path, 'utf8') }));
  const docPaths = listFiles(ROOT).filter((path) => extname(path) === '.md');
  const htmlSources = listFiles(ROOT)
    .filter((path) => extname(path) === '.html')
    .map((path) => readFileSync(path, 'utf8'));
  const findings = [
    ...files.flatMap(({ path, source }) => auditJsFile(path, source)),
    ...findDuplicates(files),
    ...findUnusedExports(files),
    ...auditDocs(docPaths),
    ...findUnusedCss([...htmlSources, ...files.map((file) => file.source)]),
  ];
  // --quiet (used by npm run check): only errors, so warnings never block a push.
  const shown = process.argv.includes('--quiet')
    ? findings.filter((f) => f.level === 'error')
    : findings;
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(shown, null, 2));
  } else {
    for (const f of shown) {
      console.log(
        `${f.level.padEnd(5)} rule ${String(f.rule).padEnd(4)} ${relative(ROOT, f.path)}:${f.line}  ${f.message}`,
      );
    }
    const count = (level) => findings.filter((f) => f.level === level).length;
    console.log(`\n${count('error')} errors, ${count('warn')} warnings, ${count('info')} notes`);
  }
  return findings.some((f) => f.level === 'error') ? 1 : 0;
}

process.exitCode = main();
