import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  SUPPORTED_LOCALES,
  dictionaries,
  getLocaleMeta,
  isSupportedLocale,
} from './dictionaries';
import { authDictionaries, shellDictionaries } from './shell-dictionaries';
import { primeNavigation, type PrimeNavNode } from '@/lib/prime/prime-navigation';

type FlatDictionary = Record<string, string>;

function flattenDictionary(value: unknown, prefix = '', output: FlatDictionary = {}): FlatDictionary {
  if (typeof value === 'string') {
    output[prefix] = value;
    return output;
  }

  if (typeof value !== 'object' || value === null) {
    return output;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    flattenDictionary(nestedValue, prefix ? `${prefix}.${key}` : key, output);
  }

  return output;
}

function extractPlaceholders(value: string) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function collectNavIds(nodes: PrimeNavNode[], output = new Set<string>()) {
  for (const node of nodes) {
    output.add(node.id);

    if (node.children?.length) {
      collectNavIds(node.children, output);
    }
  }

  return output;
}

function collectSourceFiles(dir: string, output: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, output);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      output.push(fullPath);
    }
  }

  return output;
}

function extractLiteralTranslationCalls(filePath: string) {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const calls: { key: string; file: string; line: number }[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
      const [firstArg] = node.arguments;

      if (firstArg && (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))) {
        const position = sourceFile.getLineAndCharacterOfPosition(firstArg.getStart(sourceFile));
        calls.push({
          key: firstArg.text,
          file: path.relative(process.cwd(), filePath),
          line: position.line + 1,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function expectDictionaryParity(record: Record<string, unknown>) {
  const base = flattenDictionary(record[DEFAULT_LOCALE]);
  const baseKeys = Object.keys(base).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const flat = flattenDictionary(record[locale]);
    expect(Object.keys(flat).sort()).toEqual(baseKeys);
  }
}

describe('i18n foundation', () => {
  it('keeps locale metadata aligned with supported locales', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
    expect(Object.keys(LOCALE_META).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    expect(getLocaleMeta('vi-VN')).toMatchObject({ nativeName: 'Tiếng Việt', shortLabel: 'VI' });
    expect(isSupportedLocale('ja-JP')).toBe(true);
    expect(isSupportedLocale('zh-TW')).toBe(false);
  });

  it('keeps dictionary keys aligned across locales', () => {
    expectDictionaryParity(dictionaries);
    expectDictionaryParity(shellDictionaries);
    expectDictionaryParity(authDictionaries);
  });

  it('does not ship blank dictionary values', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const flat = flattenDictionary(dictionaries[locale]);
      const blankKeys = Object.entries(flat)
        .filter(([, value]) => value.trim().length === 0)
        .map(([key]) => key);

      expect(blankKeys).toEqual([]);
    }
  });

  it('keeps translated templates from introducing unsupported placeholders', () => {
    const dictionarySets = [dictionaries, shellDictionaries, authDictionaries];

    for (const dictionarySet of dictionarySets) {
      const base = flattenDictionary(dictionarySet[DEFAULT_LOCALE]);

      for (const locale of SUPPORTED_LOCALES) {
        const flat = flattenDictionary(dictionarySet[locale]);

        for (const [key, value] of Object.entries(flat)) {
          const basePlaceholders = new Set(extractPlaceholders(base[key] ?? ''));
          const extraPlaceholders = extractPlaceholders(value).filter((placeholder) => !basePlaceholders.has(placeholder));

          expect(extraPlaceholders, `${locale}:${key}`).toEqual([]);
        }
      }
    }
  });

  it('covers every Prime navigation node with localized shell labels', () => {
    const navIds = collectNavIds(primeNavigation);

    for (const locale of SUPPORTED_LOCALES) {
      const labels = shellDictionaries[locale].navLabels;
      const missingIds = [...navIds].filter((id) => !(id in labels));

      expect(missingIds, locale).toEqual([]);
    }
  });

  it('covers every literal translation key used in source files', () => {
    const defaultDictionary = flattenDictionary(dictionaries[DEFAULT_LOCALE]);
    const sourceRoot = path.join(process.cwd(), 'src');
    const missingCalls = collectSourceFiles(sourceRoot)
      .flatMap(extractLiteralTranslationCalls)
      .filter(({ key }) => !(key in defaultDictionary));

    expect(missingCalls).toEqual([]);
  });
});
