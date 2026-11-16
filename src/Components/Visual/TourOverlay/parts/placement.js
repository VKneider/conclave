// TourOverlay's viewport placement math. Pure, so edge cases test without a DOM.
export function placeCard(target, card, placement, viewport, margin = 12, gap = 14) {
   const width = card.width, height = card.height;
   const clamp = (n, min, max) => Math.max(min, Math.min(n, Math.max(min, max)));
   const center = () => ({ left: Math.max(margin, (viewport.width - width) / 2), top: Math.max(margin, (viewport.height - height) / 2), side: 'center', arrow: 0 });
   if (!target) return center();
   const room = { bottom: viewport.height - target.bottom, top: target.top, right: viewport.width - target.right, left: target.left };
   const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
   const fits = (side) => room[side] >= (side === 'top' || side === 'bottom' ? height : width) + gap + margin;
   let side = placement === 'auto' ? Object.keys(room).sort((a, b) => room[b] - room[a]).find(fits) : placement;
   if (!side) return center();
   if (!fits(side)) side = fits(opposite[side]) ? opposite[side] : Object.keys(room).find(fits);
   if (!side) return center();
   const vertical = side === 'top' || side === 'bottom';
   let left = vertical ? target.left + (target.width - width) / 2 : side === 'left' ? target.left - width - gap : target.right + gap;
   let top = vertical ? (side === 'top' ? target.top - height - gap : target.bottom + gap) : target.top + (target.height - height) / 2;
   left = clamp(left, margin, viewport.width - width - margin);
   top = clamp(top, margin, viewport.height - height - margin);
   const arrow = vertical ? clamp(target.left + target.width / 2 - left, 20, width - 20) : clamp(target.top + target.height / 2 - top, 20, height - 20);
   return { left, top, side, arrow };
}
