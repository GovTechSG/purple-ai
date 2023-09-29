const purpleAiRules = [
    'aria-allowed-attr',
    'aria-hidden-focus',
    'aria-input-field-name',
    'aria-required-attr',
    'aria-required-children',
    'aria-required-parent',
    'aria-roles',
    'aria-toggle-field-name',
    'aria-valid-attr',
    'aria-allowed-role',
    'form-field-multiple-labels',
    'label',
    'scrollable-region-focusable',
    'select-name',
    'landmark-unique',
    'meta-viewport-large',
    'presentation-role-conflict',
    'aria-treeitem-name',
    'server-side-image-map',
    'svg-img-alt',
    'autocomplete-valid',
];

const rulesUsingRoles = [
    'aria-allowed-attr', 
    'aria-required-attr', 
    'aria-required-children', 
    'aria-required-parent', 
    'aria-roles', 
    'aria-allowed-role', 
    'aria-valid-attr-value'
]; 

const omittedRules = [
    'html-xml-lang-mismatch', 
    'frame-tested', 
    'color-contrast', 
    'link-in-text-block', 
    'page-has-heading-one',
    'duplicate-id-aria', 
    'frame-title-unique', 
    'frame-title', 
    'html-has-lang', 
    'html-lang-valid', 
    'input-image-alt', 
    'link-in-text-block', 
    'list', 
    'listitem', 
    'marquee', 
    'valid-lang', 
    'video-caption', 
    'accesskeys', 
    'empty-heading', 
    'empty-table-header', 
    'label-title-only'
];

const deprecatedRules = ['aria-roledescription', 'audio-caption', 'duplicate-id-active', 'duplicate-id'];

const catalogPath = './catalog.json'; 
const resultsFolderPath = './results';
const rangePath = './range.json'
const purpleAIPromptsPath = './purpleAIPrompts.json';

module.exports = {
    purpleAiRules, 
    rulesUsingRoles,
    catalogPath,
    resultsFolderPath,
    rangePath,
    purpleAIPromptsPath
}