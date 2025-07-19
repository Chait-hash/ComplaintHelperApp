/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Disable custom elements for better performance with Web Components
(window as any).__Zone_disable_customElements = true;

// Disable requestAnimationFrame to prevent change detection issues
// (window as any).__Zone_disable_requestAnimationFrame = true;

// Disable onProperty patch for better performance
// (window as any).__Zone_disable_on_property = true;

// Disable patching of specific events
// (window as any).__zone_symbol__BLACK_LISTED_EVENTS = ['scroll', 'mousemove'];

/*
 * For IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 * with the following flag, it will bypass `zone.js` patch for IE/Edge
 */
// (window as any).__Zone_enable_cross_context_check = true;
