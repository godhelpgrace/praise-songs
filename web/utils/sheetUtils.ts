
export const detectCategoryFromFilename = (fileName: string): string => {
    if (fileName.match(/五线|Staff/i)) return '五线谱';
    if (fileName.match(/吉他|Guitar/i)) return '吉他谱';
    if (fileName.match(/钢琴|Piano/i)) return '五线谱';
    if (fileName.match(/和弦|Chord/i)) return '和弦谱';
    if (fileName.match(/贝斯|Bass/i)) return '贝斯谱';
    if (fileName.match(/鼓|Drum/i)) return '鼓谱';
    if (fileName.match(/官方|Official/i)) return '和弦谱';
    return '';
};

export const normalizeCategory = (cat: string | undefined) => {
    if (!cat) return '和弦谱';
    if (cat === '钢琴谱') return '五线谱';
    if (cat === '简谱' || cat === '官方谱') return '和弦谱';
    return cat;
};
