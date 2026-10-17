// What the interface's parts share: the elements they all touch, the state they
// all read, and the few functions every part calls. ui.js fills it in at init;
// the other modules import it. One place, so a part's dependencies are visible
// and nothing reaches into another part's variables.
export default {
    // elements
    article: null, body: null, showcase: null, statusElement: null, commandsElement: null, overlay: null,
    // the shared document (a share link opened), the picker's state: the objects ui.js keeps
    shared: null, picker: null,
    // state the parts read; ui.js keeps the switches and answers through these
    is: { touch: false, markdown: () => false, focus: () => false, lines: () => false },
    // functions every part calls
    setStatus: () => {}, setValue: () => {}, saveState: () => {}, loadState: () => {}, track: () => {},
    openPicker: () => {}, closePicker: () => {}, caretMoved: () => {}, counterUpdate: () => {},
    openModal: () => {}, removeOverlay: () => {}, bindChoices: () => {}, selectChoice: () => {}, visibleChoices: () => [],
    sticky: () => {}, sayBeside: () => {}, updateEmptyState: () => {}, wrapLooseLines: () => {}, applySharedLook: () => {},
    caretRect: () => null, filterPicker: () => {}, setPickerIndex: () => {}, scrollPickerSelection: () => {},
    via: () => {}, look: () => ({}), fontScheme: () => '', formatKeys: (keys) => keys, counterSchedule: () => {}, contentsSchedule: () => {},
    documentsElement: null, countWords: () => ({ words: 0, characters: 0 }),
};
