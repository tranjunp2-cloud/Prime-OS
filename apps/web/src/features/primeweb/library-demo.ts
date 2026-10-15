// Categories follow ech-prime-web-v2 EditorTemplateModal.
export const libraryCategories = ['Restaurant', 'E-commerce', 'Beauty', 'Tech', 'Health', 'Education', 'Real estate', 'Fitness', 'Creative', 'Business', 'Cafe & bakery', 'Events', 'Blog', 'Travel'] as const;
export type LibraryCategory = typeof libraryCategories[number];
export const libraryDemos: { category: LibraryCategory; name: string; headline: string; description: string; color: string }[] = [
  { category: 'Restaurant', name: 'Saffron Table', headline: 'A table worth gathering around.', description: 'Seasonal dishes, warm hospitality and memorable evenings. Discover our menu and reserve your table.', color: '#a34424' },
  { category: 'E-commerce', name: 'Apex Activewear', headline: 'Move with confidence.', description: 'Performance essentials for running, training and everyday movement. Find your next favorite fit.', color: '#087f68' },
  { category: 'Beauty', name: 'Hana Beauty Studio', headline: 'Time to feel like yourself.', description: 'Personalized skincare, beauty treatments and restorative rituals. Book your next moment of care.', color: '#a44f79' },
  { category: 'Tech', name: 'Cloudline', headline: 'Work smarter, together.', description: 'Simple cloud tools to organize projects, connect your team and turn ideas into results.', color: '#365bc4' },
  { category: 'Health', name: 'Bright Dental', headline: 'Care for every smile.', description: 'Friendly dental care for the whole family, from routine check-ups to confident new smiles.', color: '#087e96' },
  { category: 'Education', name: 'Learn Forward', headline: 'Your next chapter starts here.', description: 'Practical courses and expert guidance to build skills, explore new interests and grow your career.', color: '#6751b7' },
  { category: 'Real estate', name: 'Nest Property', headline: 'Find a place to call home.', description: 'Explore considered homes and welcoming neighborhoods with guidance from local property specialists.', color: '#496a50' },
  { category: 'Fitness', name: 'Form & Flow', headline: 'Stronger at your own pace.', description: 'Small-group strength classes, yoga and personal coaching designed around your goals.', color: '#b55724' },
  { category: 'Creative', name: 'Northlight Studio', headline: 'Ideas with a different perspective.', description: 'Brand identity, photography and digital design for businesses ready to tell their story.', color: '#7852b4' },
  { category: 'Business', name: 'Meridian Consulting', headline: 'Build what comes next.', description: 'Practical strategy and operational advice to help growing businesses make their next move.', color: '#345581' },
  { category: 'Cafe & bakery', name: 'Butter & Bloom', headline: 'Fresh mornings. Sweeter moments.', description: 'Small-batch pastries, sourdough and specialty coffee, baked and brewed with care every day.', color: '#9a6437' },
  { category: 'Events', name: 'Gather Together', headline: 'Make your moment unforgettable.', description: 'Thoughtfully planned weddings, celebrations and corporate events, from the first idea to the final detail.', color: '#986479' },
  { category: 'Blog', name: 'The Daily Edit', headline: 'Stories for a curious world.', description: 'Fresh perspectives on culture, design and everyday living. Read our latest stories and interviews.', color: '#536477' },
  { category: 'Travel', name: 'Straits Heritage Tours', headline: 'A different way to discover.', description: 'Local guides, cultural walks and small-group adventures across inspiring destinations.', color: '#33824d' },
];
