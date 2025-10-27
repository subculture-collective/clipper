import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
};
const gapClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
};
/**
 * Grid component provides responsive column system with gap utilities
 */
export const Grid = React.forwardRef(({ className, cols = 12, responsive, gap = 4, auto = false, children, ...props }, ref) => {
    const responsiveClasses = responsive
        ? [
            responsive.sm && `sm:grid-cols-${responsive.sm}`,
            responsive.md && `md:grid-cols-${responsive.md}`,
            responsive.lg && `lg:grid-cols-${responsive.lg}`,
            responsive.xl && `xl:grid-cols-${responsive.xl}`,
        ].filter(Boolean)
        : [];
    return (_jsx("div", { ref: ref, className: cn('grid', auto ? 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : colsClasses[cols], gapClasses[gap], ...responsiveClasses, className), ...props, children: children }));
});
Grid.displayName = 'Grid';
