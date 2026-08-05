export function createState(defaults, { eventTarget, onUpdate } = {}) {
    const state = eventTarget ? Object.assign(eventTarget, { ...defaults }) : { ...defaults };

    state.update = (key, value) => {
        if (state[key] === value) return false;

        state[key] = value;
        onUpdate?.(state, key, value);
        return true;
    };

    if (eventTarget) {
        state.notify = (key) => {
            state.dispatchEvent(new CustomEvent(`state:${key}`, { detail: state[key] }));
        };
    }

    return state;
}
