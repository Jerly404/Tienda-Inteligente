import * as L from 'leaflet';

/** Pin used for a business's saved location across the interactive maps. */
export function businessMapPin(color = '#ef233c'): L.DivIcon {
  return L.divIcon({
    className: 'business-map-pin',
    html: `<svg viewBox="0 0 38 50" width="38" height="50" aria-hidden="true"><path d="M19 1C9 1 1 9 1 19c0 13.3 18 29.4 18 29.4S37 32.3 37 19C37 9 29 1 19 1Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="19" cy="19" r="6.5" fill="#fff"/></svg>`,
    iconSize: [38, 50],
    iconAnchor: [19, 49],
    popupAnchor: [0, -46],
  });
}
