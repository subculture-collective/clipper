import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
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
const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
};
const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
};
/**
 * Stack component provides flexbox-based spacing for vertical or horizontal layouts
 */
export const Stack = React.forwardRef(({ className, direction = 'vertical', gap = 4, align, justify, wrap = false, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('flex', direction === 'vertical' ? 'flex-col' : 'flex-row', gapClasses[gap], align && alignClasses[align], justify && justifyClasses[justify], wrap && 'flex-wrap', className), ...props, children: children }));
});
Stack.displayName = 'Stack';
