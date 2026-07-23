import { svg, getNode } from '../../Visual/Icon/icons.js';

export default class IconProvider {
  svg(name, size = 16, color = 'currentColor') {
    return svg(name, size, color);
  }

  getNode(name) {
    return getNode(name);
  }
}
