import { useMemo } from 'react';
import { DOC_TEMPLATES, type DocTemplate } from '@/lib/doc-templates';

export type TemplateCategory = 'tracking' | 'planning' | 'reference' | 'process' | 'all';

export function useTemplates(category?: TemplateCategory) {
  const filteredTemplates = useMemo(() => {
    if (!category || category === 'all') {
      return DOC_TEMPLATES;
    }
    return DOC_TEMPLATES.filter(t => t.category === category);
  }, [category]);

  const getTemplateById = (id: string): DocTemplate | undefined => {
    return DOC_TEMPLATES.find(t => t.id === id);
  };

  const getTemplatesByCategory = (cat: TemplateCategory): DocTemplate[] => {
    if (cat === 'all') {
      return DOC_TEMPLATES;
    }
    return DOC_TEMPLATES.filter(t => t.category === cat);
  };

  const categories = useMemo(() => {
    const cats = new Set(DOC_TEMPLATES.map(t => t.category));
    return Array.from(cats).sort();
  }, []);

  return {
    templates: filteredTemplates,
    allTemplates: DOC_TEMPLATES,
    categories,
    getTemplateById,
    getTemplatesByCategory,
  };
}
