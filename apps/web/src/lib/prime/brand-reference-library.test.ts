import { describe, expect, it } from 'vitest';
import {
  buildBrandReferenceLibrary,
  filterBrandReferenceProfiles,
  getBrandReferenceProfile,
} from './brand-reference-library';

describe('brand reference library', () => {
  it('ships the initial famous-brand reference set with unique ids', () => {
    const profiles = buildBrandReferenceLibrary();
    const ids = new Set(profiles.map((profile) => profile.id));

    expect(profiles).toHaveLength(12);
    expect(ids.size).toBe(profiles.length);
    expect(profiles.map((profile) => profile.name)).toEqual([
      'Apple',
      'Nike',
      'Patagonia',
      'Airbnb',
      'Spotify',
      'IKEA',
      'MUJI',
      'Uniqlo',
      'Glossier',
      'Tesla',
      'Lego',
      'Starbucks',
    ]);
  });

  it('keeps each reference profile complete enough for create-flow inspiration', () => {
    const profiles = buildBrandReferenceLibrary();

    profiles.forEach((profile) => {
      expect(profile.category).toBeTruthy();
      expect(profile.logoSrc).toBe(`/images/brand-library/${profile.id}.png`);
      expect(profile.logoAlt).toContain(profile.name);
      expect(profile.archetype).toBeTruthy();
      expect(profile.positioning.length).toBeGreaterThan(20);
      expect(profile.audience.length).toBeGreaterThan(20);
      expect(profile.voice.length).toBeGreaterThan(1);
      expect(profile.visualDirection.length).toBeGreaterThan(1);
      expect(profile.contentPillars.length).toBeGreaterThan(1);
      expect(profile.strengths.length).toBeGreaterThan(1);
      expect(profile.watchouts.length).toBeGreaterThan(1);
      expect(profile.applyToCreateFlow.positioningPrompt.length).toBeGreaterThan(20);
    });
  });

  it('filters locally across category, positioning, voice, and content pillars', () => {
    expect(filterBrandReferenceProfiles('', 'technology').map((profile) => profile.id)).toEqual(['apple', 'tesla']);
    expect(filterBrandReferenceProfiles('', 'all', { region: 'japan' }).map((profile) => profile.id)).toEqual(['muji', 'uniqlo']);
    expect(filterBrandReferenceProfiles('', 'all', { maturity: 'digital-native' }).map((profile) => profile.id)).toEqual(['spotify', 'glossier']);
    expect(filterBrandReferenceProfiles('community').map((profile) => profile.id)).toContain('glossier');
    expect(filterBrandReferenceProfiles('ritual').map((profile) => profile.id)).toContain('starbucks');
    expect(filterBrandReferenceProfiles('material honesty').map((profile) => profile.id)).toEqual(['muji']);
  });

  it('falls back to the first reference profile when an id is missing or unknown', () => {
    expect(getBrandReferenceProfile().id).toBe('apple');
    expect(getBrandReferenceProfile('missing-id').id).toBe('apple');
    expect(getBrandReferenceProfile('nike').name).toBe('Nike');
  });
});
